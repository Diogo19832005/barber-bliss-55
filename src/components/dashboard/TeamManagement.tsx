import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Loader2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TeamBarberAgenda from "./TeamBarberAgenda";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  barber_status: string;
  created_at: string;
  completed_count?: number;
}

interface TeamManagementProps {
  barbershopOwnerId: string;
}

const TeamManagement = ({ barbershopOwnerId }: TeamManagementProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [agendaBarber, setAgendaBarber] = useState<{ id: string; full_name: string } | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [barbershopOwnerId]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, avatar_url, barber_status, created_at")
      .eq("barbershop_owner_id", barbershopOwnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching team members:", error);
      setIsLoading(false);
      return;
    }

    // Fetch completed appointment counts for each member
    const membersWithStats = await Promise.all(
      (data || []).map(async (member) => {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("barber_id", member.id)
          .eq("status", "completed");

        return { ...member, completed_count: count || 0 };
      })
    );

    setTeamMembers(membersWithStats);
    setIsLoading(false);
  };

  const handleAddMember = async () => {
    const email = newMemberEmail.trim().toLowerCase();
    
    if (!email) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o email do barbeiro",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      // Find user by email
      const { data: userId, error: userError } = await supabase.rpc(
        'get_user_id_by_email' as any,
        { email_input: email }
      );

      if (userError || !userId) {
        // If user not found, show message to invite them
        toast({
          title: "Usuário não encontrado",
          description: "O barbeiro precisa se cadastrar primeiro. Depois você pode adicioná-lo à equipe.",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      // Get the profile
      const { data: memberProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, barbershop_owner_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError || !memberProfile) {
        toast({
          title: "Perfil não encontrado",
          description: "Não foi possível encontrar o perfil deste usuário",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      // Check if already a barber
      if (memberProfile.role !== "barber") {
        toast({
          title: "Não é barbeiro",
          description: "Este usuário não está cadastrado como barbeiro",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      // Check if already in another team
      if (memberProfile.barbershop_owner_id) {
        toast({
          title: "Já pertence a outra equipe",
          description: "Este barbeiro já faz parte de outra barbearia",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      // Add to team
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ barbershop_owner_id: barbershopOwnerId })
        .eq("id", memberProfile.id);

      if (updateError) {
        throw updateError;
      }

      toast({ title: "Barbeiro adicionado à equipe!" });
      setNewMemberEmail("");
      setIsAddOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsAdding(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);

    const { error } = await supabase
      .from("profiles")
      .update({ barbershop_owner_id: null })
      .eq("id", memberId);

    if (error) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Barbeiro removido da equipe" });
      fetchTeamMembers();
    }

    setRemovingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Minha Equipe
          </CardTitle>
          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Barbeiro
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhum barbeiro na equipe ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione barbeiros para que eles trabalhem na sua barbearia
              </p>
            </div>
          ) : (
             <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                          <span className="text-sm font-medium">
                            {member.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name}</p>
                          {getStatusBadge(member.barber_status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.phone || "Sem telefone"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remover
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <UserCheck className="h-4 w-4 text-success" />
                      <span className="font-medium text-foreground">{member.completed_count ?? 0}</span>
                      <span>atendimentos</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAgendaBarber({ id: member.id, full_name: member.full_name })}
                    >
                      <Calendar className="mr-1.5 h-3.5 w-3.5" />
                      Ver Agenda
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Barbeiro à Equipe</DialogTitle>
            <DialogDescription>
              Digite o email do barbeiro cadastrado que você deseja adicionar à sua equipe.
              O barbeiro precisa já estar cadastrado no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email do Barbeiro</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="barbeiro@email.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleAddMember}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barber Agenda Modal */}
      {agendaBarber && (
        <TeamBarberAgenda
          isOpen={!!agendaBarber}
          onClose={() => setAgendaBarber(null)}
          barber={agendaBarber}
        />
      )}
    </>
  );
};

export default TeamManagement;
