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
import { Loader2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addDays, isSameDay, parseISO, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
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

    // Generate time slots
    const slots: TimeSlot[] = [];
    const startHour = parseInt(schedule.start_time.split(":")[0]);
    const startMin = parseInt(schedule.start_time.split(":")[1]);
    const endHour = parseInt(schedule.end_time.split(":")[0]);
    const endMin = parseInt(schedule.end_time.split(":")[1]);

    let current = new Date(selectedDate);
    current.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMin, 0, 0);

    while (current < endTime) {
      const slotEnd = addMinutes(current, selectedService.duration_minutes);
      
      if (slotEnd > endTime) break;

      const timeStr = format(current, "HH:mm");
      const slotEndStr = format(slotEnd, "HH:mm");

      // Check if slot overlaps with existing appointments
      const isBooked = appointments?.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (
          (timeStr >= aptStart && timeStr < aptEnd) ||
          (slotEndStr > aptStart && slotEndStr <= aptEnd) ||
          (timeStr <= aptStart && slotEndStr >= aptEnd)
        );
      });

      // Check if slot is in the past
      const now = new Date();
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(
        parseInt(timeStr.split(":")[0]),
        parseInt(timeStr.split(":")[1])
      );
      const isPast = slotDateTime < now;

      slots.push({
        time: timeStr,
        available: !isBooked && !isPast,
      });

      current = addMinutes(current, 30); // 30-minute intervals
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

    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      barber_id: barber.id,
      service_id: selectedService.id,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-primary">
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
