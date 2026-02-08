import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle, Check } from "lucide-react";
import { format } from "date-fns";
import type { Appointment } from "./DashboardHome";

interface TodayAgendaListProps {
  appointments: Appointment[];
  onComplete: (id: string) => void;
  onSelect: (apt: Appointment) => void;
}

const statusConfig: Record<string, { label: string; textClass: string; barClass: string }> = {
  completed: {
    label: "✓ Concluído",
    textClass: "text-success",
    barClass: "bg-success",
  },
  cancelled: {
    label: "Cancelado",
    textClass: "text-destructive",
    barClass: "bg-destructive",
  },
  scheduled: {
    label: "⚡ Aguardando",
    textClass: "text-warning",
    barClass: "bg-warning",
  },
  in_progress: {
    label: "⚡ Em atendimento",
    textClass: "text-primary",
    barClass: "bg-primary",
  },
};

const TodayAgendaList = ({ appointments, onComplete, onSelect }: TodayAgendaListProps) => {
  const now = format(new Date(), "HH:mm:ss");
  const nextApt = appointments.find(
    (a) => a.status === "scheduled" && a.start_time >= now
  );

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-base font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Agenda de Hoje
          </span>
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
                  className={`relative flex items-center rounded-2xl border overflow-hidden transition-all cursor-pointer hover:border-primary/40 ${
                    isNext
                      ? "border-primary/30 bg-primary/5"
                      : apt.status === "completed"
                      ? "border-success/20 bg-success/5"
                      : apt.status === "cancelled"
                      ? "border-destructive/20 bg-destructive/5 opacity-50"
                      : "border-border/50 bg-card/40"
                  }`}
                  onClick={() => onSelect(apt)}
                >
                  {/* Colored left bar */}
                  <div className={`w-1 self-stretch shrink-0 ${status.barClass}`} />

                  <div className="flex flex-1 items-center justify-between gap-3 p-4">
                    {/* Time block */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center min-w-[48px]">
                        <p className={`text-base md:text-lg font-bold tabular-nums ${isNext ? "text-primary" : "text-foreground"}`}>
                          {apt.start_time.slice(0, 5)}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {apt.end_time.slice(0, 5)}
                        </p>
                      </div>

                      {/* Avatar + info */}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground font-semibold text-sm">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          {phone && (
                            <a
                              href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-success-foreground"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {clientName}
                            <span className="ml-1.5 text-muted-foreground font-normal text-xs">· {apt.start_time.slice(0, 5)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.service?.name}
                            {apt.payment_status === "prepaid" && (
                              <span className="ml-1.5 inline-flex items-center text-success">
                                · Pix <Check className="ml-0.5 h-3 w-3" />
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status + Price */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-semibold ${status.textClass}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Pix · <span className="font-semibold text-foreground">R$ {apt.service?.price?.toFixed(2)}</span>
                      </span>
                      {apt.status === "scheduled" && isNext && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
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
