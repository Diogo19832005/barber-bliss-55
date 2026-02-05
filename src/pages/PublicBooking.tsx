import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Clock, Calendar as CalendarIcon, User, ArrowLeft, Loader2, Check, Eye, EyeOff, Phone, MapPin, MessageCircle } from "lucide-react";
import { format, addMinutes, parse, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import HeroSection from "@/components/public-booking/HeroSection";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  image_url?: string | null;
}

interface Barber {
  id: string;
  full_name: string;
  avatar_url: string | null;
  public_id: number;
  slug_final: string;
  nome_exibido: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  phone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  hero_enabled: boolean | null;
  hero_button_text: string | null;
  hero_button_color: string | null;
  hero_animation_speed: number | null;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Appointment {
  appointment_date: string;
  start_time: string;
  end_time: string;
}

const PublicBooking = () => {
  const { slugFinal } = useParams<{ slugFinal: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, signUp, signIn } = useAuth();
  
  const [barber, setBarber] = useState<Barber | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<{ time: string; available: boolean; isBooked: boolean }[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showHero, setShowHero] = useState(true);
  
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Auth states
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    if (slugFinal) {
      fetchBarberData();
    }
  }, [slugFinal]);

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user && profile) {
      setClientName(profile.full_name || "");
      setClientPhone(profile.phone || "");
      setClientEmail(user.email || "");
    }
  }, [user, profile]);

  useEffect(() => {
    if (selectedDate && selectedService && selectedBarber) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedBarber]);

  const fetchBarberData = async () => {
    setIsLoading(true);
    
    // Fetch barber by slug_final
    const { data: barberData, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, public_id, slug_final, nome_exibido, logo_url, cor_primaria, cor_secundaria, phone, endereco, cidade, estado, hero_enabled, hero_button_text, hero_button_color, hero_animation_speed")
      .eq("slug_final", slugFinal)
      .eq("role", "barber")
      .eq("barber_status", "approved")
      .maybeSingle();

    if (error || !barberData) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setBarber(barberData);
    // Set showHero based on barber's preference
    setShowHero(barberData.hero_enabled !== false);

    // Fetch team members (barbers who belong to this barbershop)
    const { data: teamData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("barbershop_owner_id", barberData.id)
      .eq("role", "barber")
      .eq("barber_status", "approved")
      .order("full_name");

    // Team includes the owner plus all team members
    const allBarbers: TeamMember[] = [
      { id: barberData.id, full_name: barberData.full_name, avatar_url: barberData.avatar_url },
      ...(teamData || [])
    ];
    setTeamMembers(allBarbers);

    // If only one barber, auto-select
    if (allBarbers.length === 1) {
      setSelectedBarber(allBarbers[0]);
    }

    // Fetch services (from the barbershop owner)
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, name, description, duration_minutes, price, image_url")
      .eq("barber_id", barberData.id)
      .eq("is_active", true)
      .order("name");

    if (servicesData) setServices(servicesData);

    // If only one barber, fetch their schedules
    if (allBarbers.length === 1) {
      const { data: schedulesData } = await supabase
        .from("barber_schedules")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("barber_id", barberData.id)
        .eq("is_active", true);

      if (schedulesData) setSchedules(schedulesData);
    }

    setIsLoading(false);
  };

  const fetchBarberSchedules = async (barberId: string) => {
    const { data: schedulesData } = await supabase
      .from("barber_schedules")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("barber_id", barberId)
      .eq("is_active", true);

    if (schedulesData) {
      setSchedules(schedulesData);
    } else {
      setSchedules([]);
    }
    // Reset date and time selection when barber changes
    setSelectedDate(undefined);
    setSelectedTime(null);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !selectedService || !selectedBarber) return;

    const dayOfWeek = selectedDate.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);

    if (!schedule) {
      setAllSlots([]);
      return;
    }

    // Fetch appointments for the selected date and selected barber
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("appointment_date, start_time, end_time")
      .eq("barber_id", selectedBarber.id)
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled");

    const bookedAppointments = appointmentsData || [];

    // Generate all time slots with availability status
    const slots: { time: string; available: boolean; isBooked: boolean }[] = [];
    const startTime = parse(schedule.start_time, "HH:mm:ss", new Date());
    const endTime = parse(schedule.end_time, "HH:mm:ss", new Date());
    const serviceDuration = selectedService.duration_minutes;

    let currentSlot = startTime;

    while (isBefore(addMinutes(currentSlot, serviceDuration), endTime) || 
           format(addMinutes(currentSlot, serviceDuration), "HH:mm") === format(endTime, "HH:mm")) {
      const slotStart = format(currentSlot, "HH:mm");
      const slotEnd = format(addMinutes(currentSlot, serviceDuration), "HH:mm");

      // Check if slot conflicts with existing appointments
      const hasConflict = bookedAppointments.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (slotStart < aptEnd && slotEnd > aptStart);
      });

      // Check if slot is in the past (for today)
      const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      const isPast = isToday && isBefore(
        parse(slotStart, "HH:mm", new Date()),
        new Date()
      );

      // Only add slots that are NOT in the past
      if (!isPast) {
        slots.push({
          time: slotStart,
          available: !hasConflict,
          isBooked: hasConflict,
        });
      }

      currentSlot = addMinutes(currentSlot, 30);
    }

    setAllSlots(slots);
    setSelectedTime(null);
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setShowBookingForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Get the name and email to use (from profile if logged in, otherwise from form)
    const nameToUse = user && profile ? profile.full_name : clientName.trim();
    const emailToUse = user ? user.email : clientEmail.trim();

    if (!nameToUse || !emailToUse) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // If registering, validate password
    if (authMode === "register" && password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let clientProfileId: string;

      // If user is already logged in, use their profile
      if (user && profile) {
        clientProfileId = profile.id;
      } else if (authMode === "register") {
        // Register new user
        setIsAuthLoading(true);
        const { error: signUpError } = await signUp(
          clientEmail.trim(),
          password,
          clientName.trim(),
          "client",
          clientPhone.trim() || undefined
        );

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        // Wait for session to be established after signup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (!newUser) {
          throw new Error("Erro ao criar conta. Tente novamente.");
        }

        const { data: newProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", newUser.id)
          .maybeSingle();

        if (!newProfile) {
          throw new Error("Perfil não encontrado. Tente novamente.");
        }

        clientProfileId = newProfile.id;
        setIsAuthLoading(false);
      } else if (authMode === "login") {
        // Login existing user
        setIsAuthLoading(true);
        const { error: signInError } = await signIn(clientEmail.trim(), password);

        if (signInError) {
          throw new Error(signInError.message);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (!loggedUser) {
          throw new Error("Erro ao obter usuário");
        }

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", loggedUser.id)
          .maybeSingle();

        if (!userProfile) {
          throw new Error("Perfil não encontrado");
        }

        clientProfileId = userProfile.id;
        setIsAuthLoading(false);
      } else {
        throw new Error("Por favor, faça login ou crie uma conta para agendar.");
      }

      // Create appointment
      const endTime = format(
        addMinutes(parse(selectedTime, "HH:mm", new Date()), selectedService.duration_minutes),
        "HH:mm"
      );

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // CRITICAL: Re-validate availability right before booking to prevent double-bookings
      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("barber_id", selectedBarber.id)
        .eq("appointment_date", dateStr)
        .neq("status", "cancelled");

      // Check if slot overlaps with existing appointments
      const hasConflict = existingAppointments?.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (
          (selectedTime >= aptStart && selectedTime < aptEnd) ||
          (endTime > aptStart && endTime <= aptEnd) ||
          (selectedTime <= aptStart && endTime >= aptEnd)
        );
      });

      if (hasConflict) {
        // Refresh available slots to show updated availability
        await fetchAvailableSlots();
        throw new Error("Este horário acabou de ser reservado. Por favor, escolha outro horário.");
      }

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          client_id: clientProfileId,
          barber_id: selectedBarber.id,
          service_id: selectedService.id,
          appointment_date: dateStr,
          start_time: selectedTime,
          end_time: endTime,
          notes: `Email: ${clientEmail}${clientPhone ? `, Tel: ${clientPhone}` : ""}`,
        });

      if (appointmentError) {
        throw new Error(appointmentError.message);
      }

      setBookingSuccess(true);
      toast({
        title: "Agendamento confirmado!",
        description: `${format(selectedDate, "dd/MM/yyyy")} às ${selectedTime}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
      setIsAuthLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const dayOfWeek = date.getDay();
    const hasSchedule = schedules.some((s) => s.day_of_week === dayOfWeek);
    const isPast = isBefore(date, new Date()) && format(date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");
    return !hasSchedule || isPast;
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: barber?.cor_primaria || "#D97706" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Scissors className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-bold">Barbeiro não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          O link que você acessou não existe ou foi removido.
        </p>
        <Link to="/">
          <Button variant="gold" className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
          <Check className="h-10 w-10 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Agendamento Confirmado!</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Seu horário com {selectedBarber?.full_name || barber?.nome_exibido || barber?.full_name} foi reservado para
          <br />
          <span className="font-semibold text-foreground">
            {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
          </span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedService?.name} • R$ {selectedService?.price.toFixed(2)}
        </p>
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => {
            setBookingSuccess(false);
            setSelectedService(null);
            setSelectedBarber(teamMembers.length === 1 ? teamMembers[0] : null);
            setSelectedDate(undefined);
            setSelectedTime(null);
            setShowBookingForm(false);
            setClientName("");
            setClientEmail("");
            setClientPhone("");
          }}
        >
          Fazer novo agendamento
        </Button>
      </div>
    );
  }

  const displayName = barber?.nome_exibido || barber?.full_name;
  const primaryColor = barber?.cor_primaria || "#D97706";
  const hasAddress = barber?.endereco || barber?.cidade || barber?.estado;
  const fullAddress = [barber?.endereco, barber?.cidade, barber?.estado].filter(Boolean).join(", ");

  // Show booking form view
  if (showBookingForm && selectedService) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header with back button */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4">
            <button
              onClick={() => {
                setShowBookingForm(false);
                setSelectedDate(undefined);
                setSelectedTime(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{selectedService.name}</h1>
              <p className="text-sm text-muted-foreground">
                R$ {Number(selectedService.price).toFixed(2)} • {formatDuration(selectedService.duration_minutes)}
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-lg px-4 py-6 space-y-6">
          {/* Barber Selection - Only show if there are multiple barbers */}
          {teamMembers.length > 1 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: primaryColor }} />
                  Escolha o Barbeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedBarber(member);
                        fetchBarberSchedules(member.id);
                      }}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                        selectedBarber?.id === member.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-bold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-center">
                        {member.full_name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Selection - Only show after barber is selected */}
          {selectedBarber && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" style={{ color: primaryColor }} />
                  Escolha a Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  locale={ptBR}
                  className="rounded-xl border"
                />
              </CardContent>
            </Card>
          )}

          {/* Time Selection */}
          {selectedDate && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                  Horários Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allSlots.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">
                    Nenhum horário disponível para esta data
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {allSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`rounded-lg border p-2 text-center transition-all ${
                          selectedTime === slot.time
                            ? "text-white"
                            : slot.available
                            ? "border-border hover:border-primary/50"
                            : "cursor-not-allowed border-border/30 opacity-40"
                        }`}
                        style={selectedTime === slot.time ? { 
                          backgroundColor: primaryColor, 
                          borderColor: primaryColor 
                        } : {}}
                      >
                        <span className={`text-sm font-medium ${slot.isBooked ? "text-muted-foreground/50" : ""}`}>
                          {slot.time}
                        </span>
                        {slot.isBooked && (
                          <span className="block text-[10px] text-muted-foreground/50">
                            Já ocupado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Client Info Form */}
          {selectedTime && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: primaryColor }} />
                  Seus Dados
                </CardTitle>
                {!user && (
                  <p className="text-sm text-muted-foreground">
                    Crie uma conta ou faça login para agendar
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {/* Auth Mode Toggle - only show if not logged in */}
                {!user && (
                  <div className="mb-4 flex rounded-lg border border-border p-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        authMode === "login"
                          ? "text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={authMode === "login" ? { backgroundColor: primaryColor } : {}}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        authMode === "register"
                          ? "text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={authMode === "register" ? { backgroundColor: primaryColor } : {}}
                    >
                      Criar conta
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Show user info if logged in */}
                  {user && profile ? (
                    <div className="rounded-xl bg-secondary/50 p-4">
                      <p className="text-sm text-muted-foreground">Logado como</p>
                      <p className="font-medium">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  ) : (
                    <>
                      {/* Name field - show for register */}
                      {authMode === "register" && (
                        <div className="space-y-2">
                          <Label htmlFor="booking-client-name">Nome completo *</Label>
                          <Input
                            id="booking-client-name"
                            name="booking-client-name"
                            autoComplete="name"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Seu nome"
                            required
                            className="bg-secondary/50"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="booking-client-email">Email *</Label>
                        <Input
                          id="booking-client-email"
                          name="booking-client-email"
                          type="email"
                          autoComplete="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          className="bg-secondary/50"
                        />
                      </div>

                      {/* Phone field - show for register */}
                      {authMode === "register" && (
                        <div className="space-y-2">
                          <Label htmlFor="booking-client-phone">
                            Telefone *
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="booking-client-phone"
                              name="booking-client-phone"
                              type="tel"
                              autoComplete="tel"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              required
                              className="bg-secondary/50 pl-11"
                            />
                          </div>
                        </div>
                      )}

                      {/* Password field */}
                      <div className="space-y-2">
                        <Label htmlFor="booking-client-password">Senha *</Label>
                        <div className="relative">
                          <Input
                            id="booking-client-password"
                            name="booking-client-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={authMode === "register" ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={authMode === "register" ? "Mínimo 6 caracteres" : "Sua senha"}
                            required
                            minLength={authMode === "register" ? 6 : undefined}
                            className="bg-secondary/50 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Summary */}
                  <div className="rounded-xl bg-secondary/50 p-4">
                    <p className="text-sm font-medium">Resumo</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>{selectedService?.name}</p>
                      <p>
                        {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                      </p>
                      <p className="font-semibold" style={{ color: primaryColor }}>
                        R$ {selectedService?.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || isAuthLoading}
                    style={{ backgroundColor: primaryColor, color: "white" }}
                  >
                    {isSubmitting || isAuthLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isAuthLoading ? "Autenticando..." : "Agendando..."}
                      </>
                    ) : user ? (
                      "Confirmar Agendamento"
                    ) : authMode === "register" ? (
                      "Criar conta e Agendar"
                    ) : (
                      "Entrar e Agendar"
                    )}
                  </Button>

                  {/* Switch auth mode links */}
                  {!user && (
                    <div className="text-center text-sm text-muted-foreground">
                      {authMode === "login" ? (
                        <>
                          Não tem conta?{" "}
                          <button
                            type="button"
                            onClick={() => setAuthMode("register")}
                            className="font-medium hover:underline"
                            style={{ color: primaryColor }}
                          >
                            Criar conta
                          </button>
                        </>
                      ) : (
                        <>
                          Já tem conta?{" "}
                          <button
                            type="button"
                            onClick={() => setAuthMode("login")}
                            className="font-medium hover:underline"
                            style={{ color: primaryColor }}
                          >
                            Entrar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Show Hero Section if enabled
  if (showHero && barber?.hero_enabled !== false) {
    const heroButtonText = barber?.hero_button_text || "Agendar agora mesmo";
    const heroButtonColor = barber?.hero_button_color || primaryColor;

    return (
      <div className="min-h-screen bg-background">
        <HeroSection
          displayName={displayName || ""}
          logoUrl={barber?.logo_url || null}
          primaryColor={primaryColor}
          secondaryColor={barber?.cor_secundaria}
          phone={barber?.phone}
          address={fullAddress || undefined}
          buttonText={heroButtonText}
          buttonColor={heroButtonColor}
          animationSpeed={barber?.hero_animation_speed ?? 1.0}
          onContinue={() => setShowHero(false)}
        />
      </div>
    );
  }

  // Main public booking page
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header Card */}
      <div className="relative">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 h-72"
          style={{ 
            background: `linear-gradient(180deg, ${primaryColor}20 0%, transparent 100%)` 
          }}
        />
        
        <div className="relative container mx-auto px-4 pt-8 pb-6">
          {/* Barber Card */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-6">
              {/* Logo/Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {barber?.logo_url ? (
                    <img
                      src={barber.logo_url}
                      alt={displayName || ""}
                      className="h-32 w-32 rounded-full object-cover border-4 border-background shadow-xl"
                    />
                  ) : barber?.avatar_url ? (
                    <img
                      src={barber.avatar_url}
                      alt={displayName || ""}
                      className="h-32 w-32 rounded-full object-cover border-4 border-background shadow-xl"
                    />
                  ) : (
                    <div 
                      className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-background shadow-xl"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <span className="text-4xl font-bold" style={{ color: primaryColor }}>
                        {displayName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h1 className="text-2xl font-bold">{displayName}</h1>

                {/* Contact Info */}
                {barber?.phone && (
                  <p className="mt-2 text-muted-foreground">{barber.phone}</p>
                )}
                {hasAddress && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {fullAddress}
                  </p>
                )}

                {/* Action Buttons */}
                {barber?.phone && (
                  <div className="mt-4 flex items-center gap-3">
                    <a
                      href={`https://wa.me/55${formatPhoneForWhatsApp(barber.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </a>
                    <a
                      href={`tel:${barber.phone}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground shadow-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                    </a>
                  </div>
                )}

                {/* Consultar Agendamento Button */}
                {user && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/dashboard")}
                  >
                    Consultar Agendamento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Services Section */}
      <main className="container mx-auto px-4 pb-8">
        <div 
          className="rounded-t-xl py-4 px-4 -mx-4"
          style={{ backgroundColor: primaryColor }}
        >
          <h2 className="text-lg font-semibold text-white">Escolha um Serviço</h2>
        </div>

        <div className="divide-y divide-border bg-card rounded-b-xl border border-t-0 border-border">
          {services.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum serviço disponível
            </div>
          ) : (
            services.map((service) => (
              <div key={service.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {service.image_url && (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="h-16 w-16 rounded-lg object-cover border border-border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: primaryColor }}>
                      R$ {Number(service.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatDuration(service.duration_minutes)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleBookService(service)}
                      style={{ backgroundColor: "#EA580C", color: "white" }}
                      className="font-semibold text-xs px-4"
                    >
                      AGENDAR
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicBooking;
