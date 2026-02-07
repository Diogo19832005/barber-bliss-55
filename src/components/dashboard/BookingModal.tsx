import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Clock, Scissors } from "lucide-react";
import { format, addDays, isSameDay, parseISO, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  image_url?: string | null;
}

interface Barber {
  id: string;
  full_name: string;
  services: Service[];
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barber: Barber;
  clientId: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookingModal = ({
  isOpen,
  onClose,
  onSuccess,
  barber,
  clientId,
}: BookingModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [weekStart, setWeekStart] = useState(new Date());

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  // Realtime: auto-refresh slots when appointments change
  useEffect(() => {
    if (!isOpen) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const channel = supabase
      .channel(`booking-modal-${barber.id}-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barber.id}`,
        },
        () => {
          fetchAvailableSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, barber.id, selectedDate, selectedService]);

  const fetchAvailableSlots = async () => {
    if (!selectedService) return;

    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Get barber's schedule for this day
    const { data: schedule } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", barber.id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    if (!schedule) {
      setAvailableSlots([]);
      return;
    }

    // Get existing appointments for this day
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("barber_id", barber.id)
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

    // Collect candidate slot times: hourly + end times of existing appointments
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

      // Check if slot overlaps with break time (with tolerance support)
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

      // Client view: only show truly available slots
      if (!isDuringBreak && !isBooked && !isPast) {
        slots.push({
          time: timeStr,
          available: true,
        });
      }
    }

    setAvailableSlots(slots);
  };

  const handleBook = async () => {
    if (!selectedService || !selectedTime) return;

    setIsLoading(true);

    const startTime = selectedTime;
    const endMinutes =
      parseInt(startTime.split(":")[0]) * 60 +
      parseInt(startTime.split(":")[1]) +
      selectedService.duration_minutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
      endMinutes % 60
    ).padStart(2, "0")}`;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // CRITICAL: Re-validate availability right before booking to prevent double-bookings
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("id, start_time, end_time")
      .eq("barber_id", barber.id)
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled");

    // Check if slot overlaps with existing appointments
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
        description: `Desculpa, esse horário já foi agendado, mas ${barber.full_name} gostaria muito de cortar o seu cabelo. Marque por gentileza outro horário.`,
        variant: "destructive",
      });
      setSelectedTime(null);
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      barber_id: barber.id,
      service_id: selectedService.id,
      appointment_date: dateStr,
      start_time: startTime,
      end_time: endTime,
    });

    setIsLoading(false);

    if (error) {
      if (error.message.includes("unique_barber_appointment_slot")) {
        await fetchAvailableSlots();
        toast({
          title: "Horário indisponível",
          description: `Desculpa, esse horário já foi agendado, mas ${barber.full_name} gostaria muito de cortar o seu cabelo. Marque por gentileza outro horário.`,
          variant: "destructive",
        });
        setSelectedTime(null);
      } else {
        toast({
          title: "Erro ao agendar",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Agendado com sucesso! 🎉",
        description: `${selectedService.name} em ${format(
          selectedDate,
          "dd/MM"
        )} às ${selectedTime}`,
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
            <Label>Escolha o serviço</Label>
            <div className="space-y-2">
              {barber.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                        <Scissors className="h-6 w-6 text-muted-foreground" />
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

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Escolha a data</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
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
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedTime(null);
                    }}
                    className={cn(
                      "flex flex-col items-center rounded-xl p-2 transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isPast
                        ? "text-muted-foreground/50"
                        : "hover:bg-secondary"
                    )}
                  >
                    <span className="text-xs">
                      {format(day, "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-lg font-semibold">
                      {format(day, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Horários disponíveis</Label>
              {availableSlots.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  Nenhum horário disponível
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={cn(
                        "rounded-lg py-2 text-sm font-medium transition-colors",
                        selectedTime === slot.time
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
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
      <DialogContent className="glass-card max-w-md border-border">
        <DialogHeader>
          <DialogTitle>
            Agendar com {barber.full_name}
          </DialogTitle>
        </DialogHeader>

        {renderStep()}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(step - 1)}
            >
              Voltar
            </Button>
          )}
          {step === 2 && selectedTime && (
            <Button
              type="button"
              variant="gold"
              className="flex-1"
              onClick={handleBook}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
