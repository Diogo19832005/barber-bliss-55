import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Clock, CreditCard } from "lucide-react";

interface PaymentChoiceStepProps {
  totalPrice: number;
  primaryColor: string;
  onPayNow: () => void;
  onPayLater: () => void;
  isLoading?: boolean;
}

const PaymentChoiceStep = ({
  totalPrice,
  primaryColor,
  onPayNow,
  onPayLater,
  isLoading,
}: PaymentChoiceStepProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Valor total</p>
        <p className="text-2xl font-bold" style={{ color: primaryColor }}>
          R$ {totalPrice.toFixed(2)}
        </p>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Como deseja pagar?
      </p>

      <div className="space-y-3">
        <Card
          className="cursor-pointer border-2 border-transparent hover:border-primary/50 transition-all"
          onClick={onPayNow}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CreditCard className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Pagar agora</p>
              <p className="text-sm text-muted-foreground">
                Pague via PIX antes do atendimento
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-2 border-transparent hover:border-muted-foreground/30 transition-all"
          onClick={onPayLater}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Pagar depois</p>
              <p className="text-sm text-muted-foreground">
                Pague no momento do atendimento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentChoiceStep;
