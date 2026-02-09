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
        "rounded-lg border overflow-hidden transition-all",
        isTop3
          ? `${getMedalBg(rankPosition!)} border`
          : "border-border bg-card/50"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 md:p-3 hover:bg-secondary/30 transition-colors"
      >
        {/* Avatar/Medal - tiny */}
        {rankPosition !== undefined ? (
          <div className="relative shrink-0">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs",
                isTop3
                  ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)}`
                  : "bg-primary/10 text-primary"
              )}
            >
              {isTop3 ? (
                <Medal className={cn("h-3.5 w-3.5", getMedalColor(rankPosition))} />
              ) : (
                <span className="text-[9px]">#{rankPosition}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-[10px]">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Client info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium truncate">{client.full_name}</p>
            {rankPosition !== undefined && (
              <Badge
                className={cn(
                  "text-[8px] px-0.5 py-0 shrink-0 leading-tight",
                  isTop3
                    ? `${getMedalBg(rankPosition)} ${getMedalColor(rankPosition)} border`
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                <Trophy className="h-2 w-2 mr-0.5" />
                {rankPosition}
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
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary"
            >
              <Phone className="h-2.5 w-2.5" />
              <span className="underline truncate">{client.phone}</span>
            </a>
          )}
          {client.lastAppointmentDate && (
            <p className="text-[9px] text-muted-foreground truncate leading-tight">
              Últ: {format(new Date(client.lastAppointmentDate + "T00:00:00"), "dd/MM", { locale: ptBR })} ({formatDistanceToNow(new Date(client.lastAppointmentDate + "T00:00:00"), { addSuffix: true, locale: ptBR })})
            </p>
          )}
        </div>

        {/* Right - value + cortes */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex flex-col items-end">
            {client.totalSpent > 0 && (
              <span className="text-[10px] text-emerald-500 font-semibold whitespace-nowrap leading-tight">
                {client.totalSpent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
            <div className="flex items-baseline gap-0.5">
              <span className="text-sm font-bold text-primary leading-none">
                {client.completedAppointments}
              </span>
              <span className="text-[8px] text-muted-foreground">
                {client.completedAppointments === 1 ? "corte" : "cortes"}
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded appointments */}
      {isExpanded && (
        <div className="border-t border-border bg-secondary/10 px-2.5 py-2 md:p-3">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
            Histórico ({client.totalAppointments})
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {client.appointments.map((apt) => (
              <div
                key={apt.id}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5",
                  apt.status === "cancelled"
                    ? "bg-destructive/10"
                    : apt.status === "completed"
                    ? "bg-success/10"
                    : "bg-primary/10"
                )}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate">
                    {formatDate(apt.appointment_date)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {apt.start_time.slice(0, 5)} • {apt.service?.name || "Serviço"}
                  </p>
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
