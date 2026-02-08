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
    <Card className="glass-card border-primary/40 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 shadow-lg shadow-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Próximo atendimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-lg">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{clientName}</p>
                {phone && (
                  <a
                    href={`https://wa.me/55${phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-success hover:text-success/80 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {serviceName} · R$ {price.toFixed(2)}
              </p>
              <div className="mt-1">
                <PaymentStatusBadge status={appointment.payment_status} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-lg font-bold text-primary">
              {appointment.start_time.slice(0, 5)}
            </span>
            <Button
              size="sm"
              variant="gold"
              onClick={() => onComplete(appointment.id)}
              className="whitespace-nowrap"
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
