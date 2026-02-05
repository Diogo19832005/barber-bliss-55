import { Pause, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AccountPaused = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
          <Pause className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Conta Pausada</h1>
          <p className="text-muted-foreground">
            Sua conta está temporariamente pausada. Todos os seus dados estão seguros e serão mantidos até sua reativação.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          <p>
            Entre em contato com o administrador para reativar sua conta quando estiver pronto para voltar.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.location.href = "mailto:suporte@exemplo.com"}
          >
            <Mail className="h-4 w-4" />
            Entrar em Contato
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleLogout}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountPaused;
