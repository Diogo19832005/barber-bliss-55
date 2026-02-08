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
  const clientName = appointment.client?.full_name || "Cliente";
  const serviceName = appointment.service?.name || "";
  const price = appointment.service?.price || 0;
  const phone = appointment.client?.phone;

  return (
    <Card className="glass-card border-primary/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/6 via-transparent to-primary/4 pointer-events-none" />
      <CardHeader className="pb-2 pt-5 px-5 relative">
        <CardTitle className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gold">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          Próximo atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/15 text-primary font-bold text-lg ring-2 ring-primary/20">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg text-foreground">{clientName}</p>
                {phone && (
                  <a
                    href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {serviceName} · R$ {price.toFixed(2)}
              </p>
              <div className="mt-1.5">
                <PaymentStatusBadge status={appointment.payment_status} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <span className="text-2xl font-bold text-primary tabular-nums">
              {appointment.start_time.slice(0, 5)}
            </span>
            <Button
              size="sm"
              variant="gold"
              onClick={() => onComplete(appointment.id)}
              className="whitespace-nowrap rounded-xl px-4"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Iniciar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextClientCard;
