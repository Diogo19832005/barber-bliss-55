import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle, Zap } from "lucide-react";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";
import type { Appointment } from "./DashboardHome";

interface NextClientCardProps {
  appointment: Appointment;
  onComplete: (id: string) => void;
}

const NextClientCard = ({ appointment, onComplete }: NextClientCardProps) => {
  const clientName = appointment.client?.full_name || appointment.client_name || "Sem nome";
  const serviceName = appointment.service?.name || "";
  const price = appointment.service?.price || 0;
  const phone = appointment.client?.phone || appointment.client_phone;

  return (
    <Card className="glass-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4 md:px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          Próximo atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 md:px-5 md:pb-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-3 md:p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm">
                {clientName.charAt(0).toUpperCase()}
              </div>
              {phone && (
                <a
                  href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-success text-success-foreground"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{clientName}</p>
              <p className="text-xs text-muted-foreground truncate">{serviceName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pix · R$ {price.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
              <Zap className="h-3 w-3" />
              Aguardando
            </span>
            <Button
              size="sm"
              variant="gold"
              onClick={() => onComplete(appointment.id)}
              className="whitespace-nowrap rounded-lg px-3 text-xs h-8"
            >
              Iniciar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextClientCard;
