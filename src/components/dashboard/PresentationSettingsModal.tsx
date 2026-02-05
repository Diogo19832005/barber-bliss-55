import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, User, Image as ImageIcon, Plus, GripVertical, Trash2 } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface PresentationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: {
    id: string;
    user_id: string;
    full_name: string;
    bio: string | null;
    foto_apresentacao: string | null;
  };
}

const PresentationSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
}: PresentationSettingsModalProps) => {
  const { toast } = useToast();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(profile.bio || "");
  const [fotoApresentacao, setFotoApresentacao] = useState(profile.foto_apresentacao || "");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGallery();
    }
  }, [isOpen]);

  const fetchGallery = async () => {
    const { data } = await supabase
      .from("barber_gallery")
      .select("id, image_url, caption, display_order")
      .eq("barber_id", profile.id)
      .order("display_order", { ascending: true });

    if (data) setGalleryImages(data);
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.user_id}/apresentacao.${fileExt}`;

      // Delete existing photo if any
      if (fotoApresentacao) {
        const existingPath = fotoApresentacao.split("/gallery/")[1];
        if (existingPath) {
          await supabase.storage.from("gallery").remove([existingPath]);
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("gallery").getPublicUrl(fileName);

      setFotoApresentacao(publicUrl);
      toast({ title: "Foto enviada com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFoto = async () => {
    if (!fotoApresentacao) return;

    setIsUploading(true);
    try {
      const path = fotoApresentacao.split("/gallery/")[1];
      if (path) {
        await supabase.storage.from("gallery").remove([path]);
      }
      setFotoApresentacao("");
      toast({ title: "Foto removida" });
    } catch (error: any) {
      toast({
        title: "Erro ao remover foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingGallery(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const fileExt = file.name.split(".").pop();
        const fileName = `${profile.user_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("gallery").getPublicUrl(fileName);

        // Insert into gallery table
        const { error: insertError } = await supabase.from("barber_gallery").insert({
          barber_id: profile.id,
          image_url: publicUrl,
          display_order: galleryImages.length,
        });

        if (insertError) throw insertError;
      }

      await fetchGallery();
      toast({ title: "Imagens adicionadas!" });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  };

  const handleRemoveGalleryImage = async (image: GalleryImage) => {
    try {
      // Remove from storage
      const path = image.image_url.split("/gallery/")[1];
      if (path) {
        await supabase.storage.from("gallery").remove([path]);
      }

      // Remove from database
      await supabase.from("barber_gallery").delete().eq("id", image.id);

      setGalleryImages((prev) => prev.filter((img) => img.id !== image.id));
      toast({ title: "Imagem removida" });
    } catch (error: any) {
      toast({
        title: "Erro ao remover imagem",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCaption = async (imageId: string, caption: string) => {
    await supabase.from("barber_gallery").update({ caption }).eq("id", imageId);
    setGalleryImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        foto_apresentacao: fotoApresentacao || null,
      })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Apresentação salva!" });
      onSuccess();
      onClose();
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Apresentação
          </DialogTitle>
          <DialogDescription>
            Mostre seu trabalho e conte sobre você para seus clientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Foto de Apresentação */}
          <div className="space-y-2">
            <Label>Sua Foto</Label>
            <div className="flex items-center gap-4">
              {fotoApresentacao ? (
                <div className="relative">
                  <img
                    src={fotoApresentacao}
                    alt="Foto de apresentação"
                    className="h-24 w-24 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFoto}
                    disabled={isUploading}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fotoInputRef.current?.click()}
                  className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Enviando..." : fotoApresentacao ? "Alterar" : "Enviar foto"}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG ou WebP. Máximo 5MB.
                </p>
              </div>
            </div>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoUpload}
              className="hidden"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Sobre Você</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre sua experiência, especialidades, etc."
              className="min-h-[120px] bg-secondary/50"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500 caracteres
            </p>
          </div>

          {/* Galeria */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Galeria de Trabalhos
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploadingGallery}
              >
                {isUploadingGallery ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar
              </Button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              className="hidden"
            />

            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.image_url}
                      alt={image.caption || "Trabalho"}
                      className="aspect-square w-full rounded-lg object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(image)}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <input
                      type="text"
                      placeholder="Legenda..."
                      value={image.caption || ""}
                      onChange={(e) => handleUpdateCaption(image.id, e.target.value)}
                      className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Adicione fotos dos seus cortes e trabalhos
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="gold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PresentationSettingsModal;
