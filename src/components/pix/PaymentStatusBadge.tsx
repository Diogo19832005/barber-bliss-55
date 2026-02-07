import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: string;
}

const PaymentStatusBadge = ({ status }: PaymentStatusBadgeProps) => {
  switch (status) {
    case "prepaid":
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">
          Pagamento Antecipado
        </Badge>
      );
    case "awaiting":
      return (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px]">
          Aguardando Pagamento
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 text-[10px]">
          Pagamento Pendente
        </Badge>
      );
  }
};

export default PaymentStatusBadge;
