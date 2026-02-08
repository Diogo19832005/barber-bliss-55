import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";
import type { Appointment } from "./DashboardHome";

interface TodayAgendaListProps {
  appointments: Appointment[];
  onComplete: (id: string) => void;
  onSelect: (apt: Appointment) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: {
    label: "✓ Concluído",
    className: "text-success bg-success/10 border-success/30",
  },
  cancelled: {
    label: "Cancelado",
    className: "text-destructive bg-destructive/10 border-destructive/30",
  },
  scheduled: {
    label: "Aguardando",
    className: "text-warning bg-warning/10 border-warning/30",
  },
};

const TodayAgendaList = ({ appointments, onComplete, onSelect }: TodayAgendaListProps) => {
  const now = format(new Date(), "HH:mm:ss");
  const nextApt = appointments.find(
    (a) => a.status === "scheduled" && a.start_time >= now
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Agenda de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum agendamento para hoje
          </p>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => {
              const isNext = nextApt?.id === apt.id;
              const status = statusConfig[apt.status] || statusConfig.scheduled;
              const clientName = apt.client?.full_name || "Cliente";
              const phone = apt.client?.phone;

              return (
                <div
                  key={apt.id}
                  className={`relative flex items-center justify-between rounded-xl border p-3 md:p-4 transition-all cursor-pointer hover:border-primary/40 ${
                    isNext
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : apt.status === "completed"
                      ? "border-success/20 bg-success/5"
                      : apt.status === "cancelled"
                      ? "border-destructive/20 bg-destructive/5 opacity-60"
                      : "border-border"
                  }`}
                  onClick={() => onSelect(apt)}
                >
                  {/* Left: Time block */}
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex flex-col items-center border-r border-border/60 pr-3 md:pr-4">
                      <p className={`text-base md:text-lg font-bold ${isNext ? "text-primary" : "text-foreground"}`}>
                        {apt.start_time.slice(0, 5)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {apt.end_time.slice(0, 5)}
                      </p>
                    </div>

                    {/* Center: Client + service */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{clientName}</p>
                        {phone && (
                          <a
                            href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-success hover:text-success/80 transition-colors shrink-0"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {apt.service?.name}
                      </p>
                      <div className="mt-0.5">
                        <PaymentStatusBadge status={apt.payment_status} />
                      </div>
                    </div>
                  </div>

                  {/* Right: Status + Price */}
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] md:text-xs font-medium border ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-xs md:text-sm font-semibold text-muted-foreground">
                      R$ {apt.service?.price?.toFixed(2)}
                    </span>
                    {apt.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant={isNext ? "default" : "outline"}
                        className="mt-1 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onComplete(apt.id);
                        }}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAgendaList;
