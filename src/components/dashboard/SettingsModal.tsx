 import { useState, useRef } from "react";
 import { supabase } from "@/lib/supabase";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Palette, Store, X, MapPin, Phone, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
 
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: {
    id: string;
    user_id: string;
    full_name: string;
    nome_exibido: string | null;
    logo_url: string | null;
    cor_primaria: string | null;
    cor_secundaria: string | null;
    phone: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    hero_enabled: boolean | null;
    hero_button_text: string | null;
    hero_button_color: string | null;
    hero_animation_speed: number | null;
  };
}
 
 const predefinedColors = [
   { name: "Dourado", value: "#D97706" },
   { name: "Vermelho", value: "#DC2626" },
   { name: "Azul", value: "#2563EB" },
   { name: "Verde", value: "#059669" },
   { name: "Roxo", value: "#7C3AED" },
   { name: "Rosa", value: "#DB2777" },
   { name: "Laranja", value: "#EA580C" },
   { name: "Ciano", value: "#0891B2" },
 ];
 
 const SettingsModal = ({ isOpen, onClose, onSuccess, profile }: SettingsModalProps) => {
   const { toast } = useToast();
   const fileInputRef = useRef<HTMLInputElement>(null);
   
  const [nomeExibido, setNomeExibido] = useState(profile.nome_exibido || "");
  const [corPrimaria, setCorPrimaria] = useState(profile.cor_primaria || "#D97706");
  const [corSecundaria, setCorSecundaria] = useState(profile.cor_secundaria || "");
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || "");
  const [telefone, setTelefone] = useState(profile.phone || "");
  const [endereco, setEndereco] = useState(profile.endereco || "");
  const [cidade, setCidade] = useState(profile.cidade || "");
  const [estado, setEstado] = useState(profile.estado || "");
  const [heroEnabled, setHeroEnabled] = useState(profile.hero_enabled !== false);
  const [heroButtonText, setHeroButtonText] = useState(profile.hero_button_text || "Agendar agora mesmo");
  const [heroButtonColor, setHeroButtonColor] = useState(profile.hero_button_color || "#D97706");
  const [heroAnimationSpeed, setHeroAnimationSpeed] = useState(profile.hero_animation_speed || 1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
 
   const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     // Validate file type
     if (!file.type.startsWith("image/")) {
       toast({
         title: "Arquivo inválido",
         description: "Por favor, selecione uma imagem",
         variant: "destructive",
       });
       return;
     }
 
     // Validate file size (max 2MB)
     if (file.size > 2 * 1024 * 1024) {
       toast({
         title: "Arquivo muito grande",
         description: "A imagem deve ter no máximo 2MB",
         variant: "destructive",
       });
       return;
     }
 
     setIsUploading(true);
 
     try {
       const fileExt = file.name.split(".").pop();
       const fileName = `${profile.user_id}/logo.${fileExt}`;
 
       // Delete existing logo if any
       if (logoUrl) {
         const existingPath = logoUrl.split("/logos/")[1];
         if (existingPath) {
           await supabase.storage.from("logos").remove([existingPath]);
         }
       }
 
       // Upload new logo
       const { error: uploadError } = await supabase.storage
         .from("logos")
         .upload(fileName, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       // Get public URL
       const { data: { publicUrl } } = supabase.storage
         .from("logos")
         .getPublicUrl(fileName);
 
       setLogoUrl(publicUrl);
       toast({ title: "Logo enviada com sucesso!" });
     } catch (error: any) {
       toast({
         title: "Erro ao enviar logo",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setIsUploading(false);
     }
   };
 
   const handleRemoveLogo = async () => {
     if (!logoUrl) return;
 
     setIsUploading(true);
     try {
       const path = logoUrl.split("/logos/")[1];
       if (path) {
         await supabase.storage.from("logos").remove([path]);
       }
       setLogoUrl("");
       toast({ title: "Logo removida" });
     } catch (error: any) {
       toast({
         title: "Erro ao remover logo",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setIsUploading(false);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
    const { error } = await supabase
      .from("profiles")
      .update({
        nome_exibido: nomeExibido.trim() || null,
        logo_url: logoUrl || null,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria || null,
        phone: telefone.trim() || null,
        endereco: endereco.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        hero_enabled: heroEnabled,
        hero_button_text: heroButtonText.trim() || "Agendar agora mesmo",
        hero_button_color: heroButtonColor,
        hero_animation_speed: heroAnimationSpeed,
      })
      .eq("id", profile.id);
 
     if (error) {
       toast({
         title: "Erro ao salvar",
         description: error.message,
         variant: "destructive",
       });
     } else {
       toast({ title: "Configurações salvas!" });
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
             <Store className="h-5 w-5 text-primary" />
             Personalizar Barbearia
           </DialogTitle>
           <DialogDescription>
             Customize a aparência da sua barbearia
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-6 py-4">
           {/* Nome Exibido */}
           <div className="space-y-2">
             <Label htmlFor="nomeExibido">Nome da Barbearia</Label>
             <Input
               id="nomeExibido"
               value={nomeExibido}
               onChange={(e) => setNomeExibido(e.target.value)}
               placeholder={profile.full_name}
               className="bg-secondary/50"
             />
             <p className="text-xs text-muted-foreground">
               Nome exibido no painel e na página de agendamento
             </p>
          </div>

          {/* Contato e Endereço */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Contato e Localização
            </Label>
            
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-sm text-muted-foreground">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-secondary/50 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Exibido na página pública para contato via WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco" className="text-sm text-muted-foreground">Endereço</Label>
              <Input
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número"
                className="bg-secondary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-sm text-muted-foreground">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado" className="text-sm text-muted-foreground">Estado</Label>
                <Input
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  className="bg-secondary/50"
                />
              </div>
            </div>
          </div>


           <div className="space-y-2">
             <Label>Logo da Barbearia</Label>
             <div className="flex items-center gap-4">
               {logoUrl ? (
                 <div className="relative">
                   <img
                     src={logoUrl}
                     alt="Logo"
                     className="h-20 w-20 rounded-xl object-cover border border-border"
                   />
                   <button
                     type="button"
                     onClick={handleRemoveLogo}
                     disabled={isUploading}
                     className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                   >
                     <X className="h-3 w-3" />
                   </button>
                 </div>
               ) : (
                 <div
                   onClick={() => fileInputRef.current?.click()}
                   className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors"
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
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploading}
                 >
                   {isUploading ? "Enviando..." : logoUrl ? "Alterar" : "Enviar logo"}
                 </Button>
                 <p className="mt-1 text-xs text-muted-foreground">
                   JPG, PNG ou WebP. Máximo 2MB.
                 </p>
               </div>
             </div>
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               onChange={handleLogoUpload}
               className="hidden"
             />
           </div>
 
           {/* Cores */}
           <div className="space-y-4">
             <Label className="flex items-center gap-2">
               <Palette className="h-4 w-4" />
               Cores da Barbearia
             </Label>
             
             {/* Cor Primária */}
             <div className="space-y-2">
               <Label className="text-sm text-muted-foreground">Cor Principal</Label>
               <div className="flex flex-wrap gap-2">
                 {predefinedColors.map((color) => (
                   <button
                     key={color.value}
                     type="button"
                     onClick={() => setCorPrimaria(color.value)}
                     className={`h-10 w-10 rounded-lg transition-all ${
                       corPrimaria === color.value
                         ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                         : "hover:scale-105"
                     }`}
                     style={{ backgroundColor: color.value }}
                     title={color.name}
                   />
                 ))}
                 <div className="relative">
                   <input
                     type="color"
                     value={corPrimaria}
                     onChange={(e) => setCorPrimaria(e.target.value)}
                     className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                   />
                 </div>
               </div>
             </div>
 
             {/* Cor Secundária */}
             <div className="space-y-2">
               <Label className="text-sm text-muted-foreground">
                 Cor Secundária (opcional)
               </Label>
               <div className="flex flex-wrap gap-2">
                 <button
                   type="button"
                   onClick={() => setCorSecundaria("")}
                   className={`h-10 w-10 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
                     !corSecundaria
                       ? "border-primary bg-primary/10"
                       : "border-border hover:border-muted-foreground"
                   }`}
                   title="Nenhuma"
                 >
                   <X className="h-4 w-4 text-muted-foreground" />
                 </button>
                 {predefinedColors.map((color) => (
                   <button
                     key={color.value}
                     type="button"
                     onClick={() => setCorSecundaria(color.value)}
                     className={`h-10 w-10 rounded-lg transition-all ${
                       corSecundaria === color.value
                         ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                         : "hover:scale-105"
                     }`}
                     style={{ backgroundColor: color.value }}
                     title={color.name}
                   />
                 ))}
                 <div className="relative">
                   <input
                     type="color"
                     value={corSecundaria || "#888888"}
                     onChange={(e) => setCorSecundaria(e.target.value)}
                     className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                   />
                 </div>
               </div>
             </div>
 
             {/* Preview */}
             <div className="rounded-xl border border-border p-4">
               <p className="text-sm text-muted-foreground mb-3">Pré-visualização</p>
               <div className="flex items-center gap-3">
                 <div
                   className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold"
                   style={{ backgroundColor: corPrimaria }}
                 >
                   {(nomeExibido || profile.full_name).charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <p className="font-semibold" style={{ color: corPrimaria }}>
                     {nomeExibido || profile.full_name}
                   </p>
                   {corSecundaria && (
                     <p className="text-sm" style={{ color: corSecundaria }}>
                       Texto secundário
                     </p>
                   )}
                 </div>
            </div>

            {/* Hero Section Settings */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Página de Boas-vindas
              </Label>
              
              {/* Toggle Hero */}
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="font-medium">Exibir página de boas-vindas</p>
                  <p className="text-sm text-muted-foreground">
                    Mostra uma página inicial com botão antes dos serviços
                  </p>
                </div>
                <Switch
                  checked={heroEnabled}
                  onCheckedChange={setHeroEnabled}
                />
              </div>

              {/* Hero Button Settings - Only show if hero is enabled */}
              {heroEnabled && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroButtonText" className="text-sm text-muted-foreground">
                      Texto do Botão
                    </Label>
                    <Input
                      id="heroButtonText"
                      value={heroButtonText}
                      onChange={(e) => setHeroButtonText(e.target.value)}
                      placeholder="Agendar agora mesmo"
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Cor do Botão</Label>
                    <div className="flex flex-wrap gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setHeroButtonColor(color.value)}
                          className={`h-10 w-10 rounded-lg transition-all ${
                            heroButtonColor === color.value
                              ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <div className="relative">
                        <input
                          type="color"
                          value={heroButtonColor}
                          onChange={(e) => setHeroButtonColor(e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Preview */}
                  <div className="rounded-xl border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-3">Pré-visualização do botão</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105"
                      style={{
                        backgroundColor: heroButtonColor,
                        boxShadow: `0 10px 40px -10px ${heroButtonColor}80`,
                      }}
                    >
                      {heroButtonText || "Agendar agora mesmo"}
                    </button>
                  </div>

                  {/* Animation Speed */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      Velocidade da Animação
                    </Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0.2"
                        max="2"
                        step="0.1"
                        value={heroAnimationSpeed}
                        onChange={(e) => setHeroAnimationSpeed(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-sm font-medium min-w-[60px] text-right">
                        {heroAnimationSpeed === 1 
                          ? "Normal" 
                          : heroAnimationSpeed < 1 
                            ? `${(1 / heroAnimationSpeed).toFixed(1)}x rápido`
                            : `${heroAnimationSpeed.toFixed(1)}x lento`
                        }
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Menor = mais rápido (0.2 é muito rápido)
                    </p>
                  </div>
                </div>
              )}
            </div>
             </div>
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
 
 export default SettingsModal;