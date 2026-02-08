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
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          Agenda de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {appointments.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground text-sm">
            Nenhum agendamento para hoje
          </p>
        ) : (
          <div className="space-y-2.5">
            {appointments.map((apt) => {
              const isNext = nextApt?.id === apt.id;
              const status = statusConfig[apt.status] || statusConfig.scheduled;
              const clientName = apt.client?.full_name || apt.client_name || "Sem nome";
              const phone = apt.client?.phone || apt.client_phone;

              return (
                <div
                  key={apt.id}
                  className={`relative flex items-center justify-between rounded-2xl border p-4 md:p-5 transition-all cursor-pointer hover:border-primary/40 ${
                    isNext
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/10"
                      : apt.status === "completed"
                      ? "border-success/20 bg-success/5"
                      : apt.status === "cancelled"
                      ? "border-destructive/20 bg-destructive/5 opacity-50"
                      : "border-border/60 bg-card/40"
                  }`}
                  onClick={() => onSelect(apt)}
                >
                  {/* Left: Time block */}
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="flex flex-col items-center border-r border-border/40 pr-4 md:pr-5 min-w-[48px]">
                      <p className={`text-base md:text-lg font-bold tabular-nums ${isNext ? "text-primary" : "text-foreground"}`}>
                        {apt.start_time.slice(0, 5)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {apt.end_time.slice(0, 5)}
                      </p>
                    </div>

                    {/* Center: Client + service */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{clientName}</p>
                        {phone && (
                          <a
                            href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25 transition-colors shrink-0"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">
                        {apt.service?.name}
                      </p>
                      <div className="mt-1.5">
                        <PaymentStatusBadge status={apt.payment_status} />
                      </div>
                    </div>
                  </div>

                  {/* Right: Status + Price */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] md:text-xs font-semibold border ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-sm md:text-base font-bold text-foreground tabular-nums">
                      R$ {apt.service?.price?.toFixed(2)}
                    </span>
                    {apt.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant={isNext ? "default" : "outline"}
                        className="mt-1 h-7 text-xs rounded-lg"
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
