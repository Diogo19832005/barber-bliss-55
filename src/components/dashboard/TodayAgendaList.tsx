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
      <CardHeader className="px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 md:px-5 md:pb-5">
        {appointments.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhum agendamento para hoje
          </p>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => {
              const isNext = nextApt?.id === apt.id;
              const status = statusConfig[apt.status] || statusConfig.scheduled;
              const clientName = apt.client?.full_name || apt.client_name || "Sem nome";
              const phone = apt.client?.phone || apt.client_phone;

              return (
                <div
                  key={apt.id}
                  className={`relative flex items-center rounded-xl border overflow-hidden transition-all cursor-pointer hover:border-primary/40 max-w-full ${
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

                  <div className="flex flex-1 items-center justify-between gap-2 p-3 md:p-4 min-w-0">
                    {/* Left: Time + Avatar + Info */}
                    <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
                      {/* Time */}
                      <div className="flex flex-col items-center shrink-0 min-w-[36px] md:min-w-[48px]">
                        <p className={`text-sm md:text-lg font-bold tabular-nums ${isNext ? "text-primary" : "text-foreground"}`}>
                          {apt.start_time.slice(0, 5)}
                        </p>
                        <p className="text-[10px] md:text-[11px] text-muted-foreground tabular-nums">
                          {apt.end_time.slice(0, 5)}
                        </p>
                      </div>

                      {/* Avatar + Client */}
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-muted text-foreground font-semibold text-xs md:text-sm">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          {phone && (
                            <a
                              href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded-full bg-success text-success-foreground"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-2 w-2 md:h-2.5 md:w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs md:text-sm truncate">{clientName}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                            {apt.service?.name}
                            {apt.payment_status === "prepaid" && (
                              <span className="ml-1 text-success">
                                · Pix <Check className="inline h-2.5 w-2.5" />
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status + Price */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={`text-[10px] md:text-xs font-semibold whitespace-nowrap ${status.textClass}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                        R$ {apt.service?.price?.toFixed(2)}
                      </span>
                      {apt.status === "scheduled" && isNext && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-6 text-[10px] md:h-7 md:text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10 px-2"
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
