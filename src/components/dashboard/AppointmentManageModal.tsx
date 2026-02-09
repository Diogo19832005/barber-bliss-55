import { useState, useEffect } from "react";
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
import { Trash2, Save, Loader2, CheckCircle } from "lucide-react";
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
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (appointment) {
      setPaymentStatus(appointment.paymentStatus);
      setConfirmDelete(false);
    }
  }, [appointment?.id]);

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

  const handleComplete = async () => {
    if (!appointment) return;
    setIsCompleting(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointment.id);

    setIsCompleting(false);
    if (error) {
      toast.error("Erro ao concluir agendamento");
    } else {
      toast.success("Agendamento concluído");
      onUpdated();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointment.id);

    setIsDeleting(false);
    if (error) {
      toast.error("Erro ao excluir agendamento");
    } else {
      toast.success("Agendamento excluído");
      onUpdated();
      onClose();
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setConfirmDelete(false); onClose(); } }}>
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
                <SelectItem value="pending">Aguardando Pagamento</SelectItem>
                <SelectItem value="prepaid">Pagamento Feito</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSavePayment(); }}
              disabled={isSaving || paymentStatus === appointment.paymentStatus}
              className="w-full"
              size="sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>

          {/* Complete */}
          <div className="border-t pt-4">
            <Button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full bg-success hover:bg-success/90 text-success-foreground"
              size="sm"
            >
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Concluir Agendamento
            </Button>
          </div>

          {/* Delete */}
          <div className="border-t pt-4 space-y-2">
            {!confirmDelete ? (
              <Button
                variant="destructive"
                className="w-full"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Agendamento
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium text-center">
                  Tem certeza que deseja excluir?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
