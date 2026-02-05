import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/supabase";
 import { Scissors, Eye, EyeOff, Loader2, User, ScissorsIcon, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar sua conta",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName, role, phone);

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Verifique seu email para confirmar a conta",
    });

    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="glass-card p-8">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-gold">
                <Scissors className="h-6 w-6 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="mt-6 text-2xl font-bold">Criar conta</h1>
            <p className="mt-2 text-muted-foreground">
              Escolha como deseja usar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  role === "client"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <User className={`h-6 w-6 ${role === "client" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${role === "client" ? "text-primary" : ""}`}>
                  Sou Cliente
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("barber")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  role === "barber"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <ScissorsIcon className={`h-6 w-6 ${role === "barber" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${role === "barber" ? "text-primary" : ""}`}>
                  Sou Barbeiro
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12 bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="phone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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

            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Campos obrigatórios
            </p>

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
                  Criando...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
