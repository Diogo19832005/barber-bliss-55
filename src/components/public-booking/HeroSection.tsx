import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import TestimonialsSection from "./TestimonialsSection";

interface Service {
  id: string;
  name: string;
  image_url?: string | null;
  price: number;
}

interface Testimonial {
  id: string;
  client_name: string;
  comment: string;
}

interface HeroSectionProps {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  phone?: string | null;
  address?: string | null;
  buttonText: string;
  buttonColor: string;
  animationSpeed?: number;
  services?: Service[];
  servicesTitle?: string;
  testimonials?: Testimonial[];
  onContinue: () => void;
}

const HeroSection = ({
  displayName,
  logoUrl,
  primaryColor,
  secondaryColor,
  phone,
  address,
  buttonText,
  buttonColor,
  animationSpeed = 1.0,
  services = [],
  servicesTitle = "Meus Serviços",
  testimonials = [],
  onContinue,
}: HeroSectionProps) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Convert speed multiplier to interval: lower speed = faster animation
    // Speed 1.0 = 2000ms, Speed 0.2 = 400ms, Speed 2.0 = 4000ms
    const intervalMs = Math.round(2000 * animationSpeed);
    const interval = setInterval(() => {
      setIsAnimating((prev) => !prev);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [animationSpeed]);

  const formatPhoneForWhatsApp = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Main Hero Content */}
      <div className="flex flex-col items-center justify-center px-4 py-8 flex-grow">
        {/* Logo/Avatar */}
        <div className="mb-6 animate-fade-in">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName}
              className="h-32 w-32 rounded-2xl object-cover shadow-2xl ring-4 ring-white/10"
            />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-2xl text-5xl font-bold text-white shadow-2xl ring-4 ring-white/10"
              style={{ backgroundColor: primaryColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <h1
          className="mb-2 text-center text-3xl font-bold tracking-tight"
          style={{ color: primaryColor }}
        >
          {displayName}
        </h1>

        {/* Secondary text or tagline */}
        {secondaryColor && (
          <p className="mb-6 text-center text-sm" style={{ color: secondaryColor }}>
            <Scissors className="mr-1 inline-block h-4 w-4" />
            Barbearia Profissional
          </p>
        )}

        {/* Contact Info */}
        <div className="mb-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          {address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{address}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <span>•</span>
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            </div>
          )}
        </div>

        {/* CTA Button with animation */}
        <Button
          size="xl"
          onClick={onContinue}
          className={`relative overflow-hidden font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 ${
            isAnimating ? "scale-105" : "scale-100"
          }`}
          style={{
            backgroundColor: buttonColor,
            boxShadow: isAnimating 
              ? `0 15px 50px -5px ${buttonColor}` 
              : `0 10px 40px -10px ${buttonColor}80`,
            transition: "all 0.5s ease-in-out",
          }}
        >
          <span
            className={`transition-all duration-500 ${
              isAnimating ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-95"
            }`}
          >
            {buttonText}
          </span>
        </Button>
      </div>

      {/* Services Carousel Section */}
      {services.length > 0 && (
        <section className="py-12 px-4 border-t border-border/30">
          <div className="max-w-4xl mx-auto">
            {/* Section Title */}
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-8"
              style={{ color: primaryColor }}
            >
              {servicesTitle}
            </h2>

            {/* Carousel Container */}
            <div className="relative">
              {/* Left Arrow */}
              {services.length > 3 && (
                <button
                  onClick={() => scroll("left")}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Scrollable Container */}
              <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex-shrink-0 w-40 md:w-48 snap-center"
                  >
                    <div className="rounded-2xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm shadow-lg transition-transform hover:scale-105">
                      {/* Service Image */}
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {service.image_url ? (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Scissors
                              className="h-12 w-12"
                              style={{ color: primaryColor }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Service Info */}
                      <div className="p-3 text-center">
                        <p className="font-medium text-sm text-foreground truncate">
                          {service.name}
                        </p>
                        <p
                          className="text-xs font-semibold mt-1"
                          style={{ color: primaryColor }}
                        >
                          R$ {service.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Arrow */}
              {services.length > 3 && (
                <button
                  onClick={() => scroll("right")}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background transition-colors"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Scroll indicator for mobile */}
            <p className="text-center text-xs text-muted-foreground mt-2 md:hidden">
              ← Arraste para ver mais →
            </p>

            {/* CTA Button */}
            <div className="mt-8 flex justify-center">
              <Button
                size="xl"
                onClick={onContinue}
                className={`relative overflow-hidden font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 ${
                  isAnimating ? "scale-105" : "scale-100"
                }`}
                style={{
                  backgroundColor: buttonColor,
                  boxShadow: isAnimating
                    ? `0 15px 50px -5px ${buttonColor}`
                    : `0 10px 40px -10px ${buttonColor}80`,
                  transition: "all 0.5s ease-in-out",
                }}
              >
                <span
                  className={`transition-all duration-500 ${
                    isAnimating ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-95"
                  }`}
                >
                  Agendar agora
                </span>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <TestimonialsSection testimonials={testimonials} primaryColor={primaryColor} />

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/30 mt-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-muted-foreground/70">
            A empresa Barbie Office é responsável pela administração desses agendamentos.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HeroSection;
