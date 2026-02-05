 import { useState, useEffect } from "react";
 import { useParams, Link } from "react-router-dom";
 import { supabase } from "@/lib/supabase";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Calendar } from "@/components/ui/calendar";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Scissors, Clock, DollarSign, Calendar as CalendarIcon, User, ArrowLeft, Loader2, Check } from "lucide-react";
 import { format, addMinutes, parse, isBefore, isAfter, parseISO } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { useToast } from "@/hooks/use-toast";
 
 interface Service {
   id: string;
   name: string;
   description: string | null;
   duration_minutes: number;
   price: number;
 }
 
 interface Barber {
   id: string;
   full_name: string;
   avatar_url: string | null;
   public_id: number;
   slug_final: string;
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
   
   const [barber, setBarber] = useState<Barber | null>(null);
   const [services, setServices] = useState<Service[]>([]);
   const [schedules, setSchedules] = useState<Schedule[]>([]);
   const [appointments, setAppointments] = useState<Appointment[]>([]);
   
   const [isLoading, setIsLoading] = useState(true);
   const [notFound, setNotFound] = useState(false);
   
   const [selectedService, setSelectedService] = useState<Service | null>(null);
   const [selectedDate, setSelectedDate] = useState<Date | undefined>();
   const [selectedTime, setSelectedTime] = useState<string | null>(null);
   const [availableSlots, setAvailableSlots] = useState<string[]>([]);
   
   const [clientName, setClientName] = useState("");
   const [clientEmail, setClientEmail] = useState("");
   const [clientPhone, setClientPhone] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [bookingSuccess, setBookingSuccess] = useState(false);
 
   useEffect(() => {
     if (slugFinal) {
       fetchBarberData();
     }
   }, [slugFinal]);
 
   useEffect(() => {
     if (selectedDate && selectedService && barber) {
       fetchAvailableSlots();
     }
   }, [selectedDate, selectedService, barber]);
 
   const fetchBarberData = async () => {
     setIsLoading(true);
     
     // Fetch barber by slug_final
     const { data: barberData, error } = await supabase
       .from("profiles")
       .select("id, full_name, avatar_url, public_id, slug_final")
       .eq("slug_final", slugFinal)
       .eq("role", "barber")
       .maybeSingle();
 
     if (error || !barberData) {
       setNotFound(true);
       setIsLoading(false);
       return;
     }
 
     setBarber(barberData);
 
     // Fetch services
     const { data: servicesData } = await supabase
       .from("services")
       .select("id, name, description, duration_minutes, price")
       .eq("barber_id", barberData.id)
       .eq("is_active", true)
       .order("name");
 
     if (servicesData) setServices(servicesData);
 
     // Fetch schedules
     const { data: schedulesData } = await supabase
       .from("barber_schedules")
       .select("day_of_week, start_time, end_time, is_active")
       .eq("barber_id", barberData.id)
       .eq("is_active", true);
 
     if (schedulesData) setSchedules(schedulesData);
 
     setIsLoading(false);
   };
 
   const fetchAvailableSlots = async () => {
     if (!selectedDate || !selectedService || !barber) return;
 
     const dayOfWeek = selectedDate.getDay();
     const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);
 
     if (!schedule) {
       setAvailableSlots([]);
       return;
     }
 
     // Fetch appointments for the selected date
     const dateStr = format(selectedDate, "yyyy-MM-dd");
     const { data: appointmentsData } = await supabase
       .from("appointments")
       .select("appointment_date, start_time, end_time")
       .eq("barber_id", barber.id)
       .eq("appointment_date", dateStr)
       .neq("status", "cancelled");
 
     const bookedAppointments = appointmentsData || [];
 
     // Generate time slots
     const slots: string[] = [];
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
 
       if (!hasConflict && !isPast) {
         slots.push(slotStart);
       }
 
       currentSlot = addMinutes(currentSlot, 30);
     }
 
     setAvailableSlots(slots);
     setSelectedTime(null);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!barber || !selectedService || !selectedDate || !selectedTime) {
       toast({
         title: "Erro",
         description: "Preencha todos os campos obrigatórios",
         variant: "destructive",
       });
       return;
     }
 
     if (!clientName.trim() || !clientEmail.trim()) {
       toast({
         title: "Erro",
         description: "Nome e email são obrigatórios",
         variant: "destructive",
       });
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       // First check if user exists or create guest profile
       const { data: existingProfile } = await supabase
         .from("profiles")
         .select("id")
         .eq("full_name", clientName.trim())
         .eq("role", "client")
         .maybeSingle();
 
       let clientProfileId: string;
 
       if (existingProfile) {
         clientProfileId = existingProfile.id;
       } else {
         // Create a guest client profile
         const { data: newProfile, error: profileError } = await supabase
           .from("profiles")
           .insert({
             user_id: crypto.randomUUID(), // Generate a unique ID for guest
             full_name: clientName.trim(),
             phone: clientPhone.trim() || null,
             role: "client",
           })
           .select("id")
           .single();
 
         if (profileError || !newProfile) {
           throw new Error("Erro ao criar perfil");
         }
 
         clientProfileId = newProfile.id;
       }
 
       // Create appointment
       const endTime = format(
         addMinutes(parse(selectedTime, "HH:mm", new Date()), selectedService.duration_minutes),
         "HH:mm"
       );
 
       const { error: appointmentError } = await supabase
         .from("appointments")
         .insert({
           client_id: clientProfileId,
           barber_id: barber.id,
           service_id: selectedService.id,
           appointment_date: format(selectedDate, "yyyy-MM-dd"),
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
 
   if (isLoading) {
     return (
       <div className="flex min-h-screen items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
           Seu horário com {barber?.full_name} foi reservado para
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
             setSelectedDate(undefined);
             setSelectedTime(null);
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
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="border-b border-border bg-card/50 backdrop-blur-xl">
         <div className="container mx-auto flex items-center gap-4 px-4 py-4">
           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
             {barber?.avatar_url ? (
               <img
                 src={barber.avatar_url}
                 alt={barber.full_name}
                 className="h-full w-full rounded-full object-cover"
               />
             ) : (
               <User className="h-6 w-6 text-muted-foreground" />
             )}
           </div>
           <div>
             <h1 className="text-xl font-bold">{barber?.full_name}</h1>
             <p className="text-sm text-muted-foreground">Agende seu horário</p>
           </div>
         </div>
       </header>
 
       <main className="container mx-auto max-w-4xl px-4 py-8">
         <div className="grid gap-6 lg:grid-cols-2">
           {/* Left Column - Service Selection */}
           <div className="space-y-6">
             {/* Services */}
             <Card className="glass-card">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Scissors className="h-5 w-5 text-primary" />
                   Escolha o Serviço
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {services.length === 0 ? (
                   <p className="py-4 text-center text-muted-foreground">
                     Nenhum serviço disponível
                   </p>
                 ) : (
                   services.map((service) => (
                     <button
                       key={service.id}
                       onClick={() => setSelectedService(service)}
                       className={`w-full rounded-xl border p-4 text-left transition-all ${
                         selectedService?.id === service.id
                           ? "border-primary bg-primary/10"
                           : "border-border hover:border-muted-foreground"
                       }`}
                     >
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="font-medium">{service.name}</p>
                           {service.description && (
                             <p className="text-sm text-muted-foreground">
                               {service.description}
                             </p>
                           )}
                         </div>
                         <div className="text-right">
                           <p className="font-semibold text-primary">
                             R$ {Number(service.price).toFixed(2)}
                           </p>
                           <p className="text-xs text-muted-foreground">
                             {service.duration_minutes} min
                           </p>
                         </div>
                       </div>
                     </button>
                   ))
                 )}
               </CardContent>
             </Card>
 
             {/* Date Selection */}
             {selectedService && (
               <Card className="glass-card">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <CalendarIcon className="h-5 w-5 text-primary" />
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
           </div>
 
           {/* Right Column - Time & Form */}
           <div className="space-y-6">
             {/* Time Selection */}
             {selectedDate && selectedService && (
               <Card className="glass-card">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Clock className="h-5 w-5 text-primary" />
                     Horários Disponíveis
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   {availableSlots.length === 0 ? (
                     <p className="py-4 text-center text-muted-foreground">
                       Nenhum horário disponível para esta data
                     </p>
                   ) : (
                     <div className="grid grid-cols-4 gap-2">
                       {availableSlots.map((time) => (
                         <button
                           key={time}
                           onClick={() => setSelectedTime(time)}
                           className={`rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                             selectedTime === time
                               ? "border-primary bg-primary text-primary-foreground"
                               : "border-border hover:border-primary"
                           }`}
                         >
                           {time}
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
                     <User className="h-5 w-5 text-primary" />
                     Seus Dados
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="name">Nome completo *</Label>
                       <Input
                         id="name"
                         value={clientName}
                         onChange={(e) => setClientName(e.target.value)}
                         placeholder="Seu nome"
                         required
                         className="bg-secondary/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="email">Email *</Label>
                       <Input
                         id="email"
                         type="email"
                         value={clientEmail}
                         onChange={(e) => setClientEmail(e.target.value)}
                         placeholder="seu@email.com"
                         required
                         className="bg-secondary/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="phone">Telefone (opcional)</Label>
                       <Input
                         id="phone"
                         type="tel"
                         value={clientPhone}
                         onChange={(e) => setClientPhone(e.target.value)}
                         placeholder="(00) 00000-0000"
                         className="bg-secondary/50"
                       />
                     </div>
 
                     {/* Summary */}
                     <div className="rounded-xl bg-secondary/50 p-4">
                       <p className="text-sm font-medium">Resumo</p>
                       <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                         <p>{selectedService?.name}</p>
                         <p>
                           {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                         </p>
                         <p className="font-semibold text-primary">
                           R$ {selectedService?.price.toFixed(2)}
                         </p>
                       </div>
                     </div>
 
                     <Button
                       type="submit"
                       variant="gold"
                       size="lg"
                       className="w-full"
                       disabled={isSubmitting}
                     >
                       {isSubmitting ? (
                         <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           Agendando...
                         </>
                       ) : (
                         "Confirmar Agendamento"
                       )}
                     </Button>
                   </form>
                 </CardContent>
               </Card>
             )}
           </div>
         </div>
       </main>
     </div>
   );
 };
 
 export default PublicBooking;