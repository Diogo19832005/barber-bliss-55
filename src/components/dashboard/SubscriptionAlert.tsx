import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

interface SubscriptionAlertProps {
  barberId: string;
}

interface SubscriptionData {
  payment_status: string;
  trial_end_date: string;
  next_payment_date: string | null;
}

const SubscriptionAlert = ({ barberId }: SubscriptionAlertProps) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data } = await supabase
        .from("barber_subscriptions")
        .select("payment_status, trial_end_date, next_payment_date")
        .eq("barber_id", barberId)
        .maybeSingle();

      if (data) {
        setSubscription(data);
        calculateDaysRemaining(data);
      }
    };

    if (barberId) {
      fetchSubscription();
    }
  }, [barberId]);

  const calculateDaysRemaining = (sub: SubscriptionData) => {
    const today = new Date();
    let endDate: Date | null = null;

    if (sub.payment_status === "trial") {
      endDate = new Date(sub.trial_end_date);
    } else if (sub.payment_status === "paid" && sub.next_payment_date) {
      endDate = new Date(sub.next_payment_date);
    }

    if (endDate) {
      const days = differenceInDays(endDate, today);
      setDaysRemaining(days);
    }
  };

  if (!subscription || daysRemaining === null || daysRemaining > 7 || daysRemaining < 0) {
    return null;
  }

  const isTrial = subscription.payment_status === "trial";
  const isUrgent = daysRemaining <= 2;

  const getMessage = () => {
    if (isUrgent) {
      return isTrial
        ? "URGENTE: Assine um plano para não perder os seus dados."
        : "URGENTE: Atualize o seu plano para não perder os seus dados.";
    }
    return isTrial
      ? `Falta ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"} para seu teste gratuito acabar.`
      : `Falta ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"} para seu plano encerrar.`;
  };

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"}
      className={isUrgent 
        ? "border-destructive/50 bg-destructive/10" 
        : "border-primary/50 bg-primary/10"
      }
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle className={isUrgent ? "text-destructive" : "text-primary"}>
        {isUrgent ? "Atenção!" : "Aviso"}
      </AlertTitle>
      <AlertDescription className={isUrgent ? "text-destructive/90" : "text-foreground"}>
        {getMessage()}
      </AlertDescription>
    </Alert>
  );
};

export default SubscriptionAlert;
