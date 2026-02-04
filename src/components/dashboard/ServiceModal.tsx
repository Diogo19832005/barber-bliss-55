import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: Service | null;
  barberId: string;
}

const ServiceModal = ({
  isOpen,
  onClose,
  onSuccess,
  service,
  barberId,
}: ServiceModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || "");
      setDuration(String(service.duration_minutes));
      setPrice(String(service.price));
    } else {
      setName("");
      setDescription("");
      setDuration("30");
      setPrice("");
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      name,
      description: description || null,
      duration_minutes: parseInt(duration),
      price: parseFloat(price),
      barber_id: barberId,
    };

    let error;

    if (service) {
      const result = await supabase
        .from("services")
        .update(data)
        .eq("id", service.id);
      error = result.error;
    } else {
      const result = await supabase.from("services").insert(data);
      error = result.error;
    }

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: service ? "Serviço atualizado!" : "Serviço criado!",
      });
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md border-border">
        <DialogHeader>
          <DialogTitle>
            {service ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do serviço</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte masculino"
              required
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do serviço"
              className="bg-secondary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="15"
                step="15"
                required
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                required
                className="bg-secondary/50"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : service ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceModal;
