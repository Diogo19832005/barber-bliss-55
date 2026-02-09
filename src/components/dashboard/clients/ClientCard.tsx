import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronDown, ChevronUp, Phone, Medal, Trophy, Clock, DollarSign } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ClientData } from "../ClientsHistory";

interface ClientCardProps {
  client: ClientData;
  isExpanded: boolean;
  onToggle: () => void;
  rankPosition?: number;
}

const getMedalColor = (position: number) => {
  switch (position) {
    case 1:
      return "text-yellow-500";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-amber-700";
    default:
      return "text-primary";
  }
};

const getMedalBg = (position: number) => {
  switch (position) {
    case 1:
      return "bg-yellow-500/15 border-yellow-500/30";
    case 2:
      return "bg-gray-400/15 border-gray-400/30";
    case 3:
      return "bg-amber-700/15 border-amber-700/30";
    default:
      return "bg-primary/15 border-primary/30";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-xs">Cancelado</Badge>;
    case "scheduled":
      return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Agendado</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  return format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
};

const ClientCard = ({ client, isExpanded, onToggle, rankPosition }: ClientCardProps) => {
  const isTop3 = rankPosition !== undefined && rankPosition <= 3;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        isTop3
          ? `${getMedalBg(rankPosition!)} border`
          : "border-border bg-card/50"
      )}
    >
      {/* Client Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Rank Medal or Avatar */}
          {rankPosition !== undefined ? (
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full font-bold text-sm md:text-base",
                  isTop3
                    ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)}`
                    : "bg-primary/10 text-primary"
                )}
              >
                {isTop3 ? (
                  <Medal className={cn("h-4 w-4 md:h-5 md:w-5", getMedalColor(rankPosition))} />
                ) : (
                  <span className="text-[10px] md:text-xs">#{rankPosition}</span>
                )}
              </div>
              {isTop3 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded-full text-[7px] md:text-[8px] font-bold text-white",
                    rankPosition === 1
                      ? "bg-yellow-500"
                      : rankPosition === 2
                      ? "bg-gray-400"
                      : "bg-amber-700"
                  )}
                >
                  {rankPosition}º
                </span>
              )}
            </div>
          ) : (
          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs md:text-sm">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm md:text-base font-medium truncate">{client.full_name}</p>
              {rankPosition !== undefined && (
                <Badge
                  className={cn(
                    "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0",
                    isTop3
                      ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)} border`
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  <Trophy className="h-2.5 w-2.5 mr-0.5" />
                  TOP {rankPosition}
                </Badge>
              )}
            </div>
            {client.phone && (
              <a
                href={`https://wa.me/${(() => {
                  const digits = client.phone!.replace(/\D/g, "");
                  return digits.startsWith("55") ? digits : `55${digits}`;
                })()}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span className="underline">{client.phone}</span>
              </a>
            )}
            {client.lastAppointmentDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  Último corte: {format(new Date(client.lastAppointmentDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  {" "}({formatDistanceToNow(new Date(client.lastAppointmentDate + "T00:00:00"), { addSuffix: true, locale: ptBR })})
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {client.totalSpent > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] md:text-xs px-1.5 py-0 font-semibold whitespace-nowrap">
              {client.totalSpent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Badge>
          )}
          <div className="text-right">
            <p className="text-base md:text-lg font-bold text-primary leading-tight">
              {client.completedAppointments}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground leading-tight">
              {client.completedAppointments === 1 ? "corte" : "cortes"}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Appointments List (Expanded) */}
      {isExpanded && (
        <div className="border-t border-border bg-secondary/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Histórico de agendamentos ({client.totalAppointments})
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {client.appointments.map((apt) => (
              <div
                key={apt.id}
                className={cn(
                  "flex items-center justify-between rounded-lg p-3",
                  apt.status === "cancelled"
                    ? "bg-destructive/10"
                    : apt.status === "completed"
                    ? "bg-success/10"
                    : "bg-primary/10"
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {formatDate(apt.appointment_date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {apt.start_time.slice(0, 5)} • {apt.service?.name || "Serviço não especificado"}
                  </span>
                </div>
                {getStatusBadge(apt.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCard;
