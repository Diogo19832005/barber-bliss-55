import { Button } from "@/components/ui/button";
import { Scissors, Calendar, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <nav className="container relative z-10 flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">BarberPro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button variant="gold" size="sm">Começar</Button>
            </Link>
          </div>
        </nav>

        <div className="container relative z-10 pb-20 pt-16 text-center md:pb-32 md:pt-24">
          <div className="animate-slide-up">
            <span className="mb-4 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
              ✨ Sistema completo de agendamento
            </span>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Sua barbearia no{" "}
              <span className="gradient-text">próximo nível</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Gerencie agendamentos, clientes e finanças em um único lugar. 
              Interface moderna e intuitiva para você e seus clientes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button variant="gold" size="xl">
                  Criar conta grátis
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Tudo que você precisa
          </h2>
          <p className="mt-4 text-muted-foreground">
            Recursos pensados para facilitar o dia a dia da sua barbearia
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="Agendamento Online"
            description="Clientes agendam 24/7 diretamente pelo sistema"
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6" />}
            title="Gestão de Horários"
            description="Defina sua disponibilidade e evite conflitos"
          />
          <FeatureCard
            icon={<DollarSign className="h-6 w-6" />}
            title="Dashboard Financeiro"
            description="Acompanhe ganhos diários, semanais e mensais"
          />
          <FeatureCard
            icon={<Scissors className="h-6 w-6" />}
            title="Catálogo de Serviços"
            description="Cadastre serviços com preços e duração"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-20">
        <div className="glass-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            Pronto para começar?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Crie sua conta em segundos e comece a organizar sua agenda
          </p>
          <Link to="/register">
            <Button variant="gold" size="lg" className="mt-8">
              Começar agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 BarberPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="glass-card p-6 transition-all duration-300 hover:shadow-glow">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {icon}
    </div>
    <h3 className="mb-2 font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Landing;
