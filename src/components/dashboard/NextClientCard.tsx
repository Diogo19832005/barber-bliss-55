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
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <Calendar className="h-5 w-5 text-primary" />
          Próximo atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-card/60 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground font-bold text-base">
                {clientName.charAt(0).toUpperCase()}
              </div>
              {phone && (
                <a
                  href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3 w-3" />
                </a>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{clientName}</p>
              <p className="text-sm text-muted-foreground">
                {serviceName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pix · R$ {price.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
              <Zap className="h-3 w-3" />
              Aguardando
            </span>
            <Button
              size="sm"
              variant="gold"
              onClick={() => onComplete(appointment.id)}
              className="whitespace-nowrap rounded-xl px-4"
            >
              Iniciar atendimento
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextClientCard;
