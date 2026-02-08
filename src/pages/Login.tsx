import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Scissors, Eye, EyeOff, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LoginRole = "barber" | "client";

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Verify the user's role matches the selected login role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, barber_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile && profile.role !== selectedRole) {
        await supabase.auth.signOut();
        toast({
          title: "Tipo de conta incorreto",
          description: selectedRole === "barber"
            ? "Esta conta não é de barbeiro. Tente entrar como cliente."
            : "Esta conta não é de cliente. Tente entrar como barbeiro.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: "Bem-vindo de volta!",
      description: "Login realizado com sucesso",
    });

    navigate("/dashboard");
  };

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="glass-card p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-gold">
                <Scissors className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="mt-6 text-2xl font-bold">Entrar na conta</h1>
              <p className="mt-2 text-muted-foreground">
                Como deseja entrar?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedRole("barber")}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-primary hover:bg-secondary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-gold">
                  <Scissors className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Sou Barbeiro</p>
                  <p className="text-sm text-muted-foreground">Acessar minha barbearia</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole("client")}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-primary hover:bg-secondary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Sou Cliente</p>
                  <p className="text-sm text-muted-foreground">Acessar minha conta de cliente</p>
                </div>
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="glass-card p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-gold">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">
              Entrar como {selectedRole === "barber" ? "Barbeiro" : "Cliente"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Entre para acessar sua área
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button
              onClick={() => { setSelectedRole(null); setEmail(""); setPassword(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar para escolha
            </button>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
