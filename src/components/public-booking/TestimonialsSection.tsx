import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  client_name: string;
  comment: string;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  primaryColor: string;
}

const TestimonialsSection = ({ testimonials, primaryColor }: TestimonialsSectionProps) => {
  if (testimonials.length === 0) return null;

  return (
    <section className="py-12 px-4 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-bold text-center mb-8"
          style={{ color: primaryColor }}
        >
          O que dizem nossos clientes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5 relative"
            >
              <Quote
                className="absolute top-3 right-3 h-5 w-5 opacity-20"
                style={{ color: primaryColor }}
              />
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-3.5 w-3.5 fill-current"
                    style={{ color: primaryColor }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-3 italic">
                "{testimonial.comment}"
              </p>
              <p className="text-sm font-semibold text-foreground">
                — {testimonial.client_name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
