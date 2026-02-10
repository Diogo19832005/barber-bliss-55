import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, MessageSquareQuote } from "lucide-react";

interface Testimonial {
  id: string;
  client_name: string;
  comment: string;
  display_order: number;
}

interface TestimonialsManagerProps {
  profileId: string;
}

const TestimonialsManager = ({ profileId }: TestimonialsManagerProps) => {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, [profileId]);

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("barber_testimonials")
      .select("id, client_name, comment, display_order")
      .eq("barber_id", profileId)
      .order("display_order");

    setTestimonials(data || []);
    setIsLoading(false);
  };

  const addTestimonial = () => {
    if (testimonials.length >= 4) {
      toast({ title: "Máximo de 4 depoimentos", variant: "destructive" });
      return;
    }
    setTestimonials([
      ...testimonials,
      { id: `new-${Date.now()}`, client_name: "", comment: "", display_order: testimonials.length },
    ]);
  };

  const updateField = (index: number, field: "client_name" | "comment", value: string) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  };

  const removeTestimonial = async (index: number) => {
    const item = testimonials[index];
    if (!item.id.startsWith("new-")) {
      await supabase.from("barber_testimonials").delete().eq("id", item.id);
    }
    setTestimonials(testimonials.filter((_, i) => i !== index));
    toast({ title: "Depoimento removido" });
  };

  const saveAll = async () => {
    // Validate
    for (const t of testimonials) {
      if (!t.client_name.trim() || !t.comment.trim()) {
        toast({ title: "Preencha nome e comentário de todos os depoimentos", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);

    // Delete all existing, then re-insert
    await supabase.from("barber_testimonials").delete().eq("barber_id", profileId);

    if (testimonials.length > 0) {
      const { error } = await supabase.from("barber_testimonials").insert(
        testimonials.map((t, i) => ({
          barber_id: profileId,
          client_name: t.client_name.trim(),
          comment: t.comment.trim(),
          display_order: i,
        }))
      );

      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setIsSaving(false);
        return;
      }
    }

    toast({ title: "Depoimentos salvos!" });
    await fetchTestimonials();
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base">
          <MessageSquareQuote className="h-4 w-4" />
          Provas Sociais ({testimonials.length}/4)
        </Label>
        {testimonials.length < 4 && (
          <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Adicione até 4 depoimentos de clientes para exibir na sua página pública
      </p>

      {testimonials.map((t, index) => (
        <div key={t.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Depoimento {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTestimonial(index)}
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome do cliente</Label>
            <Input
              value={t.client_name}
              onChange={(e) => updateField(index, "client_name", e.target.value)}
              placeholder="Ex: João Silva"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Comentário</Label>
            <Textarea
              value={t.comment}
              onChange={(e) => updateField(index, "comment", e.target.value)}
              placeholder="Ex: Melhor barbeiro da cidade!"
              className="bg-secondary/50 min-h-[60px]"
              rows={2}
            />
          </div>
        </div>
      ))}

      {testimonials.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum depoimento adicionado ainda
        </div>
      )}

      {testimonials.length > 0 && (
        <Button type="button" onClick={saveAll} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Depoimentos"
          )}
        </Button>
      )}
    </div>
  );
};

export default TestimonialsManager;
