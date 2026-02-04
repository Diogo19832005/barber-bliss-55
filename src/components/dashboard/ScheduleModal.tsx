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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedules: Schedule[];
  barberId: string;
}

const dayNames = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const ScheduleModal = ({
  isOpen,
  onClose,
  onSuccess,
  schedules,
  barberId,
}: ScheduleModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<
    Array<{
      day: number;
      start: string;
      end: string;
      active: boolean;
    }>
  >([]);

  useEffect(() => {
    const initial = [0, 1, 2, 3, 4, 5, 6].map((day) => {
      const existing = schedules.find((s) => s.day_of_week === day);
      return {
        day,
        start: existing?.start_time?.slice(0, 5) || "09:00",
        end: existing?.end_time?.slice(0, 5) || "18:00",
        active: existing?.is_active ?? (day >= 1 && day <= 5),
      };
    });
    setLocalSchedules(initial);
  }, [schedules]);

  const handleUpdate = (day: number, field: string, value: string | boolean) => {
    setLocalSchedules((prev) =>
      prev.map((s) => (s.day === day ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Delete existing schedules
    await supabase.from("barber_schedules").delete().eq("barber_id", barberId);

    // Insert new schedules
    const toInsert = localSchedules.map((s) => ({
      barber_id: barberId,
      day_of_week: s.day,
      start_time: s.start,
      end_time: s.end,
      is_active: s.active,
    }));

    const { error } = await supabase.from("barber_schedules").insert(toInsert);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Horários atualizados!" });
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-h-[90vh] max-w-lg overflow-y-auto border-border">
        <DialogHeader>
          <DialogTitle>Horários de Trabalho</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {localSchedules.map((schedule) => (
            <div
              key={schedule.day}
              className={`rounded-xl border p-4 transition-colors ${
                schedule.active ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <Label className="font-medium">{dayNames[schedule.day]}</Label>
                <Switch
                  checked={schedule.active}
                  onCheckedChange={(checked) =>
                    handleUpdate(schedule.day, "active", checked)
                  }
                />
              </div>

              {schedule.active && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Início
                    </Label>
                    <Input
                      type="time"
                      value={schedule.start}
                      onChange={(e) =>
                        handleUpdate(schedule.day, "start", e.target.value)
                      }
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fim</Label>
                    <Input
                      type="time"
                      value={schedule.end}
                      onChange={(e) =>
                        handleUpdate(schedule.day, "end", e.target.value)
                      }
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleModal;
