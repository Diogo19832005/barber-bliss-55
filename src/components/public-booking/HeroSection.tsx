import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, MapPin, Phone, MessageCircle, ArrowDown } from "lucide-react";

interface HeroSectionProps {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  phone?: string | null;
  address?: string | null;
  buttonText: string;
  buttonColor: string;
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
  onContinue,
}: HeroSectionProps) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatPhoneForWhatsApp = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
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
        className="relative overflow-hidden font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105"
        style={{
          backgroundColor: buttonColor,
          boxShadow: `0 10px 40px -10px ${buttonColor}80`,
        }}
      >
        <span
          className={`inline-flex items-center gap-2 transition-transform duration-500 ${
            isAnimating ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-90"
          }`}
        >
          {buttonText}
          <ArrowDown
            className={`h-4 w-4 transition-transform duration-500 ${
              isAnimating ? "translate-y-0" : "translate-y-1"
            }`}
          />
        </span>
      </Button>

      {/* Subtle scroll indicator */}
      <div className="mt-12 flex flex-col items-center gap-2 text-muted-foreground/50">
        <div
          className={`h-8 w-0.5 rounded-full transition-all duration-1000 ${
            isAnimating ? "opacity-100 scale-y-100" : "opacity-50 scale-y-75"
          }`}
          style={{ backgroundColor: primaryColor }}
        />
      </div>
    </div>
  );
};

export default HeroSection;
