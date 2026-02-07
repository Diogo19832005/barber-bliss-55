import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppointmentManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    date: string;
    paymentStatus: string;
  } | null;
  onUpdated: () => void;
}

const AppointmentManageModal = ({
  isOpen,
  onClose,
  appointment,
  onUpdated,
}: AppointmentManageModalProps) => {
  const [paymentStatus, setPaymentStatus] = useState(appointment?.paymentStatus || "pending");
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleSavePayment = async () => {
    if (!appointment) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("appointments")
      .update({ payment_status: paymentStatus })
      .eq("id", appointment.id);

    setIsSaving(false);
    if (error) {
      toast.error("Erro ao atualizar pagamento");
    } else {
      toast.success("Status de pagamento atualizado");
      onUpdated();
      onClose();
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setIsCancelling(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);

    setIsCancelling(false);
    if (error) {
      toast.error("Erro ao cancelar agendamento");
    } else {
      toast.success("Agendamento cancelado");
      onUpdated();
      onClose();
    }
  };

  // Sync local state when appointment changes
  if (appointment && paymentStatus !== appointment.paymentStatus && !isSaving) {
    setPaymentStatus(appointment.paymentStatus);
  }

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setConfirmCancel(false); onClose(); } }}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Gerenciar Agendamento</DialogTitle>
          <DialogDescription>
            {appointment.clientName} — {appointment.startTime.slice(0, 5)} · {appointment.date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Payment status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status de Pagamento</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pagamento Pendente</SelectItem>
                <SelectItem value="prepaid">Pagamento Antecipado</SelectItem>
                <SelectItem value="awaiting">Aguardando Pagamento</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSavePayment(); }}
              disabled={isSaving || paymentStatus === appointment.paymentStatus}
              className="w-full"
              size="sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Pagamento
            </Button>
          </div>

          {/* Cancel */}
          <div className="border-t pt-4 space-y-2">
            {!confirmCancel ? (
              <Button
                variant="destructive"
                className="w-full"
                size="sm"
                onClick={() => setConfirmCancel(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancelar Agendamento
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium text-center">
                  Tem certeza? Isso não pode ser desfeito.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentManageModal;
