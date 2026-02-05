import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface BarberShowcaseProps {
  barberId: string;
  displayName: string;
  bio: string | null;
  fotoApresentacao: string | null;
  primaryColor: string;
}

const BarberShowcase = ({
  barberId,
  displayName,
  bio,
  fotoApresentacao,
  primaryColor,
}: BarberShowcaseProps) => {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  useEffect(() => {
    fetchGallery();
  }, [barberId]);

  const fetchGallery = async () => {
    const { data } = await supabase
      .from("barber_gallery")
      .select("id, image_url, caption, display_order")
      .eq("barber_id", barberId)
      .order("display_order", { ascending: true });

    if (data) setGalleryImages(data);
  };

  const handlePrevImage = () => {
    if (selectedImage === null) return;
    setSelectedImage(selectedImage > 0 ? selectedImage - 1 : galleryImages.length - 1);
  };

  const handleNextImage = () => {
    if (selectedImage === null) return;
    setSelectedImage(selectedImage < galleryImages.length - 1 ? selectedImage + 1 : 0);
  };

  // Don't render if there's no content to show
  if (!bio && !fotoApresentacao && galleryImages.length === 0) {
    return null;
  }

  return (
    <section className="py-8 px-4 border-b border-border">
      <div className="max-w-2xl mx-auto">
        {/* Profile Photo and Bio */}
        {(fotoApresentacao || bio) && (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            {fotoApresentacao && (
              <div className="shrink-0">
                <img
                  src={fotoApresentacao}
                  alt={displayName}
                  className="h-32 w-32 rounded-2xl object-cover shadow-lg ring-2 ring-border"
                />
              </div>
            )}
            {bio && (
              <div className="flex-1 text-center sm:text-left">
                <h2 
                  className="text-xl font-semibold mb-3"
                  style={{ color: primaryColor }}
                >
                  Sobre mim
                </h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {bio}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <div>
            <h3 
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <ImageIcon className="h-5 w-5" />
              Meu Trabalho
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {galleryImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className="aspect-square overflow-hidden rounded-lg border border-border hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={image.image_url}
                    alt={image.caption || `Trabalho ${index + 1}`}
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox for gallery */}
        <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
            {selectedImage !== null && galleryImages[selectedImage] && (
              <div className="relative">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <img
                  src={galleryImages[selectedImage].image_url}
                  alt={galleryImages[selectedImage].caption || ""}
                  className="w-full max-h-[80vh] object-contain"
                />
                
                {galleryImages[selectedImage].caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-center">
                      {galleryImages[selectedImage].caption}
                    </p>
                  </div>
                )}

                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default BarberShowcase;
