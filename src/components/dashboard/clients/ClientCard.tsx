import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronDown, ChevronUp, Phone, Medal, Trophy, Clock } from "lucide-react";
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
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Rank Medal or Avatar */}
          {rankPosition !== undefined ? (
            <div className="relative">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg",
                  isTop3
                    ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)}`
                    : "bg-primary/10 text-primary"
                )}
              >
                {isTop3 ? (
                  <Medal className={cn("h-6 w-6", getMedalColor(rankPosition))} />
                ) : (
                  <span className="text-sm">#{rankPosition}</span>
                )}
              </div>
              {isTop3 && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-medium">{client.full_name}</p>
              {rankPosition !== undefined && (
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    isTop3
                      ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)} border`
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  <Trophy className="h-3 w-3 mr-0.5" />
                  TOP {rankPosition}
                </Badge>
              )}
            </div>
            {client.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.lastAppointmentDate && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Último corte: {format(new Date(client.lastAppointmentDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  {" "}({formatDistanceToNow(new Date(client.lastAppointmentDate + "T00:00:00"), { addSuffix: true, locale: ptBR })})
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {client.completedAppointments}
            </p>
            <p className="text-xs text-muted-foreground">
              {client.completedAppointments === 1 ? "corte" : "cortes"}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
