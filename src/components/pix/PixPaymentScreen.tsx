import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, QrCode, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentScreenProps {
  totalPrice: number;
  pixKey: string;
  pixQrCode?: string | null;
  barberName: string;
  primaryColor: string;
  onConfirmPayment: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const PixPaymentScreen = ({
  totalPrice,
  pixKey,
  pixQrCode,
  barberName,
  primaryColor,
  onConfirmPayment,
  onBack,
  isLoading,
}: PixPaymentScreenProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast({ title: "Chave PIX copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Valor */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center p-6">
          <DollarSign className="h-8 w-8 mb-2" style={{ color: primaryColor }} />
          <p className="text-sm text-muted-foreground">Valor total do serviço</p>
          <p className="text-3xl font-bold mt-1" style={{ color: primaryColor }}>
            R$ {totalPrice.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Digite este valor no seu banco ao realizar o pagamento via PIX
          </p>
        </CardContent>
      </Card>

      {/* QR Code */}
      {pixQrCode && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center p-6">
            <p className="text-sm font-medium mb-3">QR Code PIX</p>
            {pixQrCode.startsWith("http") ? (
              <img
                src={pixQrCode}
                alt="QR Code PIX"
                className="h-48 w-48 rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <QrCode className="h-16 w-16 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center break-all max-w-[280px]">
                  {pixQrCode}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(pixQrCode);
                    toast({ title: "Código copiado!" });
                  }}
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copiar código
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chave PIX */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Chave PIX</p>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3">
            <p className="flex-1 text-sm font-mono break-all">{pixKey}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyKey}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar chave PIX
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmar pagamento */}
      <Button
        className="w-full"
        size="lg"
        disabled={isLoading}
        onClick={onConfirmPayment}
        style={{ backgroundColor: primaryColor, color: "white" }}
      >
        <Check className="mr-2 h-4 w-4" />
        Já realizei o pagamento
      </Button>

      <Button
        variant="ghost"
        className="w-full"
        onClick={onBack}
      >
        Voltar
      </Button>
    </div>
  );
};

export default PixPaymentScreen;
