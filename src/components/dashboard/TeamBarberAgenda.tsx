import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamBarberAgendaProps {
  isOpen: boolean;
  onClose: () => void;
  barber: {
    id: string;
    full_name: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

const TeamBarberAgenda = ({ isOpen, onClose, barber }: TeamBarberAgendaProps) => {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && barber.id) {
      fetchAppointments();
    }
  }, [isOpen, barber.id]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd");

    const [todayRes, upcomingRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(`
          id, appointment_date, start_time, end_time, status,
          client_name, client_phone,
          client:profiles!appointments_client_id_fkey(full_name, phone),
          service:services(name, price)
        `)
        .eq("barber_id", barber.id)
        .eq("appointment_date", todayStr)
        .order("start_time", { ascending: true }),
      supabase
        .from("appointments")
        .select(`
          id, appointment_date, start_time, end_time, status,
          client_name, client_phone,
          client:profiles!appointments_client_id_fkey(full_name, phone),
          service:services(name, price)
        `)
        .eq("barber_id", barber.id)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .gte("appointment_date", tomorrowStr)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(20),
    ]);

    setTodayAppointments((todayRes.data as any) || []);
    setUpcomingAppointments((upcomingRes.data as any) || []);
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="border-success text-success text-[10px]">Concluído</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="border-destructive text-destructive text-[10px]">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="border-primary text-primary text-[10px]">Agendado</Badge>;
    }
  };

  const renderAppointment = (apt: Appointment) => {
    const clientName = apt.client?.full_name || apt.client_name || "Cliente avulso";
    const clientPhone = apt.client?.phone || apt.client_phone;

    return (
      <div
        key={apt.id}
        className="flex items-center justify-between rounded-xl border border-border p-3"
      >
        <div className="flex items-center gap-3">
          <div className="text-center min-w-[50px]">
            <p className="text-sm font-semibold">{apt.start_time.slice(0, 5)}</p>
            <p className="text-[10px] text-muted-foreground">{apt.end_time.slice(0, 5)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{clientName}</p>
              {clientPhone && (
                <a
                  href={`https://wa.me/${clientPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] text-success hover:bg-success/30 transition-colors"
                >
                  <MessageCircle className="h-2.5 w-2.5" />
                  WhatsApp
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {apt.service?.name} • R$ {apt.service?.price?.toFixed(2)}
            </p>
          </div>
        </div>
        {getStatusBadge(apt.status)}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agenda de {barber.full_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Hoje — {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
              </h3>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum agendamento para hoje
                </p>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map(renderAppointment)}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Próximos Dias
              </h3>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum agendamento futuro
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id}>
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {format(new Date(apt.appointment_date + "T00:00:00"), "EEEE, d/MM", { locale: ptBR })}
                      </p>
                      {renderAppointment(apt)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamBarberAgenda;
