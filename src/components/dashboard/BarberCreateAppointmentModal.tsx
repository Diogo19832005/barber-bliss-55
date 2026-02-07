import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Clock, Scissors, UserPlus, Search } from "lucide-react";
import { format, addDays, isSameDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  image_url?: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ExistingClient {
  id: string;
  full_name: string;
  phone: string | null;
  user_id: string;
}

interface BarberCreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barberId: string;
}

const BarberCreateAppointmentModal = ({
  isOpen,
  onClose,
  onSuccess,
  barberId,
}: BarberCreateAppointmentModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [weekStart, setWeekStart] = useState(new Date());

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedExistingClient, setSelectedExistingClient] = useState<ExistingClient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExistingClient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchClients();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(new Date());
    setSelectedTime(null);
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setSelectedExistingClient(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, image_url")
      .eq("barber_id", barberId)
      .eq("is_active", true)
      .order("name");
    if (data) setServices(data);
  };

  const searchClients = async () => {
    setIsSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, user_id")
      .eq("role", "client")
      .ilike("full_name", `%${searchQuery}%`)
      .limit(5);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedService) return;

    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { data: schedule } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", barberId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    if (!schedule) {
      setAvailableSlots([]);
      return;
    }

    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled");

    // Generate time slots - hourly by default + extra slots after appointments end
    const slots: TimeSlot[] = [];
    const startHour = parseInt(schedule.start_time.split(":")[0]);
    const startMin = parseInt(schedule.start_time.split(":")[1]);
    const endHour = parseInt(schedule.end_time.split(":")[0]);
    const endMin = parseInt(schedule.end_time.split(":")[1]);

    const schedStart = new Date(selectedDate);
    schedStart.setHours(startHour, startMin, 0, 0);
    const schedEnd = new Date(selectedDate);
    schedEnd.setHours(endHour, endMin, 0, 0);

    const candidateTimes = new Set<string>();

    let hourly = new Date(schedStart);
    while (hourly < schedEnd) {
      candidateTimes.add(format(hourly, "HH:mm"));
      hourly = addMinutes(hourly, 60);
    }

    appointments?.forEach((apt) => {
      candidateTimes.add(apt.end_time.slice(0, 5));
    });

    const sortedTimes = Array.from(candidateTimes).sort();

    for (const timeStr of sortedTimes) {
      const current = new Date(selectedDate);
      current.setHours(parseInt(timeStr.split(":")[0]), parseInt(timeStr.split(":")[1]), 0, 0);
      const slotEnd = addMinutes(current, selectedService.duration_minutes);

      if (slotEnd > schedEnd) continue;

      const slotEndStr = format(slotEnd, "HH:mm");

      let isDuringBreak = false;
      if ((schedule as any).has_break && (schedule as any).break_start && (schedule as any).break_end) {
        const breakStartStr = (schedule as any).break_start.slice(0, 5);
        const breakEndStr = (schedule as any).break_end.slice(0, 5);
        const overlapsBreak = timeStr < breakEndStr && slotEndStr > breakStartStr;
        
        if (overlapsBreak) {
          if ((schedule as any).break_tolerance_enabled && (schedule as any).break_tolerance_minutes > 0) {
            const toleranceMinutes = (schedule as any).break_tolerance_minutes;
            const breakStartDate = new Date(selectedDate);
            breakStartDate.setHours(parseInt(breakStartStr.split(":")[0]), parseInt(breakStartStr.split(":")[1]), 0, 0);
            const maxEnd = format(addMinutes(breakStartDate, toleranceMinutes), "HH:mm");
            isDuringBreak = timeStr >= breakStartStr || slotEndStr > maxEnd;
          } else {
            isDuringBreak = true;
          }
        }
      }

      const isBooked = appointments?.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (
          (timeStr >= aptStart && timeStr < aptEnd) ||
          (slotEndStr > aptStart && slotEndStr <= aptEnd) ||
          (timeStr <= aptStart && slotEndStr >= aptEnd)
        );
      });

      const now = new Date();
      const isPast = current < now;

      if (!isDuringBreak) {
        slots.push({ time: timeStr, available: !isBooked && !isPast });
      }
    }

    setAvailableSlots(slots);
  };

  const handleBook = async () => {
    if (!selectedService || !selectedTime) return;
    if (!selectedExistingClient && !clientName.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const startTime = selectedTime;
    const endMinutes =
      parseInt(startTime.split(":")[0]) * 60 +
      parseInt(startTime.split(":")[1]) +
      selectedService.duration_minutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Re-validate availability
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("id, start_time, end_time")
      .eq("barber_id", barberId)
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled");

    const hasConflict = existingAppointments?.some((apt) => {
      const aptStart = apt.start_time.slice(0, 5);
      const aptEnd = apt.end_time.slice(0, 5);
      return (
        (startTime >= aptStart && startTime < aptEnd) ||
        (endTime > aptStart && endTime <= aptEnd) ||
        (startTime <= aptStart && endTime >= aptEnd)
      );
    });

    if (hasConflict) {
      await fetchAvailableSlots();
      setIsLoading(false);
      toast({
        title: "Horário indisponível",
        description: "Este horário já está reservado.",
        variant: "destructive",
      });
      setSelectedTime(null);
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      barber_id: barberId,
      service_id: selectedService.id,
      appointment_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      created_by: barberId,
      client_id: selectedExistingClient?.id ?? undefined,
      client_name: selectedExistingClient ? selectedExistingClient.full_name : clientName.trim(),
      client_email: (!selectedExistingClient && clientEmail.trim()) ? clientEmail.trim() : undefined,
      client_phone: (!selectedExistingClient && clientPhone.trim()) ? clientPhone.trim() : undefined,
    } as any);

    setIsLoading(false);

    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Agendado com sucesso! 🎉",
        description: `${selectedService.name} em ${format(selectedDate, "dd/MM")} às ${selectedTime}`,
      });
      onSuccess();
      onClose();
    }
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Dados do Cliente</Label>
            
            {/* Search existing clients */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Buscar cliente cadastrado</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedExistingClient(null);
                  }}
                  className="pl-9"
                />
              </div>
              {isSearching && <p className="text-sm text-muted-foreground">Buscando...</p>}
              {searchResults.length > 0 && (
                <div className="space-y-1 rounded-lg border border-border p-1">
                  {searchResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedExistingClient(client);
                        setClientName(client.full_name);
                        setSearchQuery(client.full_name);
                        setSearchResults([]);
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                    >
                      <span className="font-medium">{client.full_name}</span>
                      {client.phone && <span className="ml-2 text-muted-foreground">{client.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedExistingClient && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="text-sm">Cliente selecionado: <strong>{selectedExistingClient.full_name}</strong></span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs"
                  onClick={() => {
                    setSelectedExistingClient(null);
                    setSearchQuery("");
                    setClientName("");
                  }}
                >
                  Remover
                </Button>
              </div>
            )}

            {!selectedExistingClient && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Ou cadastre um novo cliente:</p>
                <div>
                  <Label htmlFor="client-name">Nome *</Label>
                  <Input
                    id="client-name"
                    placeholder="Nome do cliente"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="client-email">E-mail (opcional)</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="client-phone">Telefone (opcional)</Label>
                  <Input
                    id="client-phone"
                    placeholder="(11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label>Escolha o serviço</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service);
                    setStep(3);
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                        <Scissors className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-primary flex-shrink-0">
                      R$ {Number(service.price).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Escolha a data e horário</Label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                    className={cn(
                      "flex flex-col items-center rounded-xl p-2 transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : isPast ? "text-muted-foreground/50" : "hover:bg-secondary"
                    )}
                  >
                    <span className="text-xs">{format(day, "EEE", { locale: ptBR })}</span>
                    <span className="text-lg font-semibold">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Horários disponíveis</Label>
              {availableSlots.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">Nenhum horário disponível</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={cn(
                        "rounded-lg py-2 text-sm font-medium transition-colors",
                        selectedTime === slot.time
                          ? "bg-primary text-primary-foreground"
                          : slot.available
                          ? "bg-secondary hover:bg-secondary/80"
                          : "bg-secondary/50 text-muted-foreground/50"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Criar Agendamento
          </DialogTitle>
        </DialogHeader>

        {renderStep()}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step === 1 && (selectedExistingClient || clientName.trim()) && (
            <Button type="button" variant="gold" className="flex-1" onClick={() => setStep(2)}>
              Próximo
            </Button>
          )}
          {step === 3 && selectedTime && (
            <Button type="button" variant="gold" className="flex-1" onClick={handleBook} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarberCreateAppointmentModal;
