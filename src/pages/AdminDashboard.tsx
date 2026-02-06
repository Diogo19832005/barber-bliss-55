import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAdminPermissions, AdminPermissions, PERMISSION_LABELS } from "@/hooks/useAdminPermissions";
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserPlus,
  Mail,
  Loader2,
  CalendarDays,
  CreditCard,
  Store,
  MessageCircle,
  Filter,
  BarChart3,
  Settings2,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import RevenueDashboard from "@/components/admin/RevenueDashboard";
import AdminActivityLog from "@/components/admin/AdminActivityLog";
import { logAdminAction } from "@/lib/adminLogger";

interface BarberSubscription {
  barber_id: string;
  plan_type: string;
  payment_status: string;
}

interface Barber {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  barber_status: string;
  created_at: string;
  public_id: number | null;
  slug_final: string | null;
  is_barbershop_admin: boolean;
  barbershop_owner_id: string | null;
  subscription?: BarberSubscription | null;
}

interface Admin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  permissions?: AdminPermissions;
}

type AdminSection = "barbeiros" | "mensalidades" | "receita" | "historico" | "administradores";

const navItems = [
  { label: "Barbeiros", href: "/admin", icon: <Users className="h-4 w-4" /> },
  { label: "Mensalidades", href: "/admin/subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Administradores", href: "/admin/admins", icon: <Shield className="h-4 w-4" /> },
];

const AdminDashboard = () => {
  const { profile, user, isAdmin, isChiefAdmin, isLoading: authLoading } = useAuth();
  const { permissions: myPermissions, isLoading: permLoading } = useAdminPermissions();
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("barbeiros");
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "collaborator_admin">("collaborator_admin");
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermissions>({
    can_approve_barbers: false,
    can_suspend_barbers: false,
    can_view_emails: false,
    can_view_contacts: false,
    can_view_financials: false,
    can_manage_subscriptions: false,
  });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editPermValues, setEditPermValues] = useState<AdminPermissions | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMode, setFilterMode] = useState<"month" | "dateRange">("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: barbersData } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, barber_status, created_at, public_id, slug_final, is_barbershop_admin, barbershop_owner_id")
      .eq("role", "barber")
      .order("created_at", { ascending: false });

    const { data: subscriptionsData } = await supabase
      .from("barber_subscriptions")
      .select("barber_id, plan_type, payment_status");

    const subsMap = new Map<string, BarberSubscription>();
    subscriptionsData?.forEach(sub => subsMap.set(sub.barber_id, sub));

    if (barbersData) {
      const barbersWithEmails = await Promise.all(
        barbersData.map(async (barber) => {
          const { data: email } = await supabase.rpc(
            'get_user_email_by_id' as any,
            { target_user_id: barber.user_id }
          );
          return { ...barber, email: email as string | null, subscription: subsMap.get(barber.id) || null };
        })
      );
      setBarbers(barbersWithEmails);
    }

    const { data: adminsData } = await supabase
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .in("role", ["admin", "collaborator_admin"] as any);

    const { data: allPermissions } = await supabase
      .from("admin_permissions")
      .select("*");

    const permMap = new Map<string, AdminPermissions>();
    allPermissions?.forEach((p: any) => permMap.set(p.user_id, {
      can_approve_barbers: p.can_approve_barbers,
      can_suspend_barbers: p.can_suspend_barbers,
      can_view_emails: p.can_view_emails,
      can_view_contacts: p.can_view_contacts,
      can_view_financials: p.can_view_financials,
      can_manage_subscriptions: p.can_manage_subscriptions,
    }));

    if (adminsData) {
      const adminsWithEmails = await Promise.all(
        adminsData.map(async (admin) => {
          const { data: email } = await supabase.rpc(
            'get_user_email_by_id' as any,
            { target_user_id: admin.user_id }
          );
          return { 
            ...admin, 
            role: admin.role as string, 
            email: email as string | undefined,
            permissions: permMap.get(admin.user_id),
          };
        })
      );
      setAdmins(adminsWithEmails);
    }

    setIsLoading(false);
  };

  const handleApprove = async (barberId: string) => {
    setProcessingId(barberId);
    const barber = barbers.find(b => b.id === barberId);
    const { error } = await supabase
      .from("profiles")
      .update({ barber_status: "approved" })
      .eq("id", barberId);
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      await logAdminAction({ action: "approve_barber", targetType: "barber", targetId: barberId, targetName: barber?.full_name });
      toast({ title: "Barbeiro aprovado com sucesso!" });
      fetchData();
    }
    setProcessingId(null);
  };

  const handleReject = async (barberId: string) => {
    setProcessingId(barberId);
    const barber = barbers.find(b => b.id === barberId);
    const wasPreviouslyApproved = barber?.barber_status === "approved";
    const { error } = await supabase
      .from("profiles")
      .update({ barber_status: "rejected" })
      .eq("id", barberId);
    if (error) {
      toast({ title: "Erro ao recusar", description: error.message, variant: "destructive" });
    } else {
      await logAdminAction({ 
        action: wasPreviouslyApproved ? "suspend_barber" : "reject_barber", 
        targetType: "barber", targetId: barberId, targetName: barber?.full_name 
      });
      toast({ title: wasPreviouslyApproved ? "Barbeiro suspenso" : "Barbeiro recusado" });
      fetchData();
    }
    setProcessingId(null);
  };

  const handleToggleBarbershopAdmin = async (barberId: string, currentStatus: boolean) => {
    setProcessingId(barberId);
    const barber = barbers.find(b => b.id === barberId);
    const { error } = await supabase
      .from("profiles")
      .update({ is_barbershop_admin: !currentStatus })
      .eq("id", barberId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await logAdminAction({ 
        action: "toggle_barbershop_admin", targetType: "barber", targetId: barberId, targetName: barber?.full_name,
        details: !currentStatus ? "Definido como admin de barbearia" : "Removido como admin de barbearia"
      });
      toast({ title: !currentStatus ? "Barbeiro definido como administrador da barbearia!" : "Permissão de administrador removida" });
      fetchData();
    }
    setProcessingId(null);
  };

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: "Campo obrigatório", description: "Digite o email do usuário", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Email inválido", description: "Digite um email válido", variant: "destructive" });
      return;
    }
    setIsAddingAdmin(true);
    const { data: authUser, error: authError } = await supabase.rpc('get_user_id_by_email' as any, { email_input: email });
    if (authError || !authUser) {
      toast({ title: "Usuário não encontrado", description: "Nenhum usuário cadastrado com esse email", variant: "destructive" });
      setIsAddingAdmin(false);
      return;
    }
    const userId = authUser as string;
    const { data: existingAdmin } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (existingAdmin) {
      toast({ title: "Já é administrador", description: "Este usuário já possui permissões de administrador", variant: "destructive" });
      setIsAddingAdmin(false);
      return;
    }
    const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role: newAdminRole as any }]);
    if (error) {
      toast({ title: "Erro ao adicionar admin", description: error.message, variant: "destructive" });
    } else {
      if (newAdminRole === 'collaborator_admin') {
        await supabase.from("admin_permissions").upsert([{ user_id: userId, ...newAdminPermissions }] as any);
      }
      await logAdminAction({ action: "add_admin", targetType: "admin", targetName: email, details: `Tipo: ${newAdminRole === 'admin' ? 'Chefe' : 'Colaborador'}` });
      toast({ title: "Administrador adicionado!" });
      setNewAdminEmail("");
      setNewAdminPermissions({ can_approve_barbers: false, can_suspend_barbers: false, can_view_emails: false, can_view_contacts: false, can_view_financials: false, can_manage_subscriptions: false });
      setIsAddAdminOpen(false);
      fetchData();
    }
    setIsAddingAdmin(false);
  };

  const handleSavePermissions = async (adminUserId: string, perms: AdminPermissions) => {
    const { error } = await supabase.from("admin_permissions").upsert([{ user_id: adminUserId, ...perms }] as any);
    if (error) {
      toast({ title: "Erro ao salvar permissões", description: error.message, variant: "destructive" });
    } else {
      const admin = admins.find(a => a.user_id === adminUserId);
      await logAdminAction({ action: "update_permissions", targetType: "admin", targetName: admin?.email, targetId: adminUserId });
      toast({ title: "Permissões atualizadas!" });
      setEditingPermissions(null);
      setEditPermValues(null);
      fetchData();
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminUserId: string) => {
    if (adminUserId === user?.id) {
      toast({ title: "Ação não permitida", description: "Você não pode remover a si mesmo", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("id", adminId);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      const admin = admins.find(a => a.id === adminId);
      await logAdminAction({ action: "remove_admin", targetType: "admin", targetName: admin?.email, targetId: adminUserId });
      toast({ title: "Administrador removido" });
      fetchData();
    }
  };

  const handleChangeAdminRole = async (adminId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("id", adminId);
    if (error) {
      toast({ title: "Erro ao alterar função", description: error.message, variant: "destructive" });
    } else {
      const admin = admins.find(a => a.id === adminId);
      await logAdminAction({ action: "change_admin_role", targetType: "admin", targetName: admin?.email, details: `Novo cargo: ${newRole === 'admin' ? 'Chefe' : 'Colaborador'}` });
      toast({ title: newRole === 'admin' ? "Promovido a Administrador Chefe!" : "Alterado para Colaborador" });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-success text-success"><CheckCircle className="mr-1 h-3 w-3" />Aprovado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-destructive text-destructive"><XCircle className="mr-1 h-3 w-3" />Recusado</Badge>;
      default:
        return null;
    }
  };

  const pendingBarbers = barbers.filter(b => b.barber_status === "pending");
  const approvedBarbers = barbers.filter(b => b.barber_status === "approved");
  const rejectedBarbers = barbers.filter(b => b.barber_status === "rejected");

  const months = [
    { value: "all", label: "Todos os meses" },
    { value: "0", label: "Janeiro" }, { value: "1", label: "Fevereiro" }, { value: "2", label: "Março" },
    { value: "3", label: "Abril" }, { value: "4", label: "Maio" }, { value: "5", label: "Junho" },
    { value: "6", label: "Julho" }, { value: "7", label: "Agosto" }, { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" }, { value: "10", label: "Novembro" }, { value: "11", label: "Dezembro" },
  ];

  const availableYears = useMemo(() => {
    const years = new Set(barbers.map(b => new Date(b.created_at).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [barbers]);

  const isFilterActive = filterMode === "month" ? filterMonth !== "all" : !!(dateRange?.from && dateRange?.to);

  const filteredBarbers = useMemo(() => {
    if (filterMode === "dateRange") {
      if (!dateRange?.from || !dateRange?.to) return barbers;
      const from = dateRange.from;
      const to = dateRange.to;
      return barbers.filter(b => {
        const d = new Date(b.created_at);
        return d >= from && d <= new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
      });
    }
    if (filterMonth === "all") return barbers;
    return barbers.filter(b => {
      const d = new Date(b.created_at);
      return d.getMonth() === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear);
    });
  }, [barbers, filterMonth, filterYear, filterMode, dateRange]);

  const planStats = useMemo(() => {
    const filtered = filteredBarbers;
    const withSub = filtered.filter(b => b.subscription && b.subscription.payment_status !== 'trial');
    const monthly = withSub.filter(b => b.subscription?.plan_type === 'monthly').length;
    const quarterly = withSub.filter(b => b.subscription?.plan_type === 'quarterly').length;
    const semiannual = withSub.filter(b => b.subscription?.plan_type === 'semiannual').length;
    const yearly = withSub.filter(b => b.subscription?.plan_type === 'yearly').length;
    const trial = filtered.filter(b => b.subscription?.payment_status === 'trial').length;
    const paid = filtered.filter(b => b.subscription?.payment_status === 'paid').length;
    const noSub = filtered.filter(b => !b.subscription).length;
    return { total: filtered.length, monthly, quarterly, semiannual, yearly, trial, paid, noSub };
  }, [filteredBarbers]);

  if (authLoading || isLoading || permLoading) {
    return (
      <DashboardLayout navItems={navItems}>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const sectionButtons: { key: AdminSection; label: string; icon: React.ReactNode; chiefOnly?: boolean; permissionKey?: keyof AdminPermissions }[] = [
    { key: "barbeiros", label: "Barbeiros", icon: <Users className="h-4 w-4" /> },
    { key: "mensalidades", label: "Mensalidades", icon: <CreditCard className="h-4 w-4" />, permissionKey: "can_view_financials" },
    { key: "receita", label: "Receita", icon: <BarChart3 className="h-4 w-4" />, chiefOnly: true },
    { key: "historico", label: "Histórico", icon: <History className="h-4 w-4" />, chiefOnly: true },
    { key: "administradores", label: "Administradores", icon: <Shield className="h-4 w-4" /> },
  ];

  const visibleSections = sectionButtons.filter(s => {
    if (s.chiefOnly && !isChiefAdmin) return false;
    if (s.permissionKey && !isChiefAdmin && !myPermissions[s.permissionKey]) return false;
    return true;
  });

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie barbeiros e administradores</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2">
          {visibleSections.map((section) => (
            <Button
              key={section.key}
              variant={activeSection === section.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection(section.key)}
              className="gap-2"
            >
              {section.icon}
              {section.label}
            </Button>
          ))}
        </div>

        {/* === BARBEIROS === */}
        {activeSection === "barbeiros" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
                    <Clock className="h-4 w-4" />Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{pendingBarbers.length}</p></CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle className="h-4 w-4" />Aprovados
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{approvedBarbers.length}</p></CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <XCircle className="h-4 w-4" />Recusados
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{rejectedBarbers.length}</p></CardContent>
              </Card>
            </div>

            {/* Pending Barbers */}
            {pendingBarbers.length > 0 && (
              <Card className="glass-card border-warning/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <Clock className="h-5 w-5" />Barbeiros Aguardando Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingBarbers.map((barber) => (
                    <div key={barber.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{barber.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {myPermissions.can_view_contacts && barber.phone ? (
                            <a href={`https://wa.me/${barber.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-success hover:underline">
                              <MessageCircle className="h-3 w-3" />{barber.phone}
                            </a>
                          ) : myPermissions.can_view_contacts ? "Sem telefone" : null}
                          {myPermissions.can_view_contacts && " • "}
                          {"Cadastrado em "}{new Date(barber.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {myPermissions.can_view_emails && barber.email && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{barber.email}</p>
                        )}
                      </div>
                      {myPermissions.can_approve_barbers && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-success text-success hover:bg-success hover:text-success-foreground" onClick={() => handleApprove(barber.id)} disabled={processingId === barber.id}>
                            {processingId === barber.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-1 h-4 w-4" />Aprovar</>}
                          </Button>
                          <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(barber.id)} disabled={processingId === barber.id}>
                            <XCircle className="mr-1 h-4 w-4" />Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Period Filter */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />Filtrar por Período de Cadastro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" variant={filterMode === "month" ? "default" : "outline"} onClick={() => setFilterMode("month")}>Por Mês</Button>
                  <Button size="sm" variant={filterMode === "dateRange" ? "default" : "outline"} onClick={() => setFilterMode("dateRange")}>Por Datas</Button>
                </div>
                {filterMode === "month" ? (
                  <div className="flex flex-wrap gap-3">
                    <div className="w-48">
                      <Label className="text-xs text-muted-foreground">Mês</Label>
                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {filterMonth !== "all" && (
                      <div className="w-32">
                        <Label className="text-xs text-muted-foreground">Ano</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                          <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">Período</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal bg-secondary/50", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</> : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })) : <span>Selecione o período</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ptBR} className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {dateRange?.from && <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)} className="text-muted-foreground">Limpar</Button>}
                  </div>
                )}
                {isFilterActive && myPermissions.can_view_financials && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold">{planStats.total}</p><p className="text-xs text-muted-foreground">Cadastrados no período</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-success">{planStats.paid}</p><p className="text-xs text-muted-foreground">Com plano ativo (pago)</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{planStats.trial}</p><p className="text-xs text-muted-foreground">Em período de teste</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{planStats.noSub}</p><p className="text-xs text-muted-foreground">Sem assinatura</p>
                    </div>
                  </div>
                )}
                {isFilterActive && myPermissions.can_view_financials && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1"><BarChart3 className="h-3 w-3" />Mensal: {planStats.monthly}</Badge>
                    <Badge variant="outline" className="gap-1">Trimestral: {planStats.quarterly}</Badge>
                    <Badge variant="outline" className="gap-1">Semestral: {planStats.semiannual}</Badge>
                    <Badge variant="outline" className="gap-1">Anual: {planStats.yearly}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Barbers */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {isFilterActive ? `Barbeiros no período (${filteredBarbers.length})` : `Todos os Barbeiros (${barbers.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredBarbers.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Nenhum barbeiro encontrado neste período</p>
                ) : (
                  <div className="space-y-3">
                    {filteredBarbers.map((barber) => (
                      <div key={barber.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{barber.full_name}</p>
                            {getStatusBadge(barber.barber_status)}
                            {barber.is_barbershop_admin && !barber.barbershop_owner_id && (
                              <Badge variant="outline" className="border-primary text-primary"><Store className="mr-1 h-3 w-3" />Admin Barbearia</Badge>
                            )}
                            {barber.barbershop_owner_id && (
                              <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Membro de equipe</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {myPermissions.can_view_contacts && barber.phone ? (
                              <a href={`https://wa.me/${barber.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-success hover:underline">
                                <MessageCircle className="h-3 w-3" />{barber.phone}
                              </a>
                            ) : myPermissions.can_view_contacts ? "Sem telefone" : null}
                            {barber.slug_final && ` • /${barber.slug_final}`}
                          </p>
                          {myPermissions.can_view_emails && barber.email && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{barber.email}</p>
                          )}
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />Cadastro: {new Date(barber.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {barber.barber_status === "approved" && !barber.barbershop_owner_id && isChiefAdmin && (
                            <Button size="sm" variant="outline" className={barber.is_barbershop_admin ? "border-muted-foreground text-muted-foreground" : "border-primary text-primary"} onClick={() => handleToggleBarbershopAdmin(barber.id, barber.is_barbershop_admin)} disabled={processingId === barber.id}>
                              <Store className="mr-1 h-4 w-4" />{barber.is_barbershop_admin ? "Remover Admin" : "Definir Admin"}
                            </Button>
                          )}
                          {barber.barber_status !== "approved" && myPermissions.can_approve_barbers && (
                            <>
                              <Button size="sm" variant="outline" className="border-success text-success" onClick={() => handleApprove(barber.id)} disabled={processingId === barber.id}>
                                <CheckCircle className="mr-1 h-4 w-4" />Aprovar
                              </Button>
                              {barber.barber_status === "pending" && (
                                <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => handleReject(barber.id)} disabled={processingId === barber.id}>
                                  <XCircle className="mr-1 h-4 w-4" />Recusar
                                </Button>
                              )}
                            </>
                          )}
                          {barber.barber_status === "approved" && myPermissions.can_suspend_barbers && (
                            <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => handleReject(barber.id)} disabled={processingId === barber.id}>
                              <XCircle className="mr-1 h-4 w-4" />Suspender
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* === MENSALIDADES === */}
        {activeSection === "mensalidades" && <SubscriptionManager />}

        {/* === RECEITA === */}
        {activeSection === "receita" && isChiefAdmin && <RevenueDashboard />}

        {/* === HISTÓRICO === */}
        {activeSection === "historico" && isChiefAdmin && <AdminActivityLog />}

        {/* === ADMINISTRADORES === */}
        {activeSection === "administradores" && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Administradores</CardTitle>
              {isChiefAdmin && (
                <Button variant="gold" size="sm" onClick={() => setIsAddAdminOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", admin.role === 'admin' ? "bg-primary/20" : "bg-secondary")}>
                          <Shield className={cn("h-5 w-5", admin.role === 'admin' ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{admin.email || (admin.user_id === user?.id ? "Você" : `Admin ${admin.id.slice(0, 8)}`)}</p>
                            <Badge variant="outline" className={admin.role === 'admin' ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"}>
                              {admin.role === 'admin' ? 'Chefe' : 'Colaborador'}
                            </Badge>
                            {admin.user_id === user?.id && <Badge variant="secondary" className="text-xs">Você</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">Desde {new Date(admin.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      {isChiefAdmin && admin.user_id !== user?.id && (
                        <div className="flex gap-2">
                          <Select value={admin.role} onValueChange={(value) => handleChangeAdminRole(admin.id, value)}>
                            <SelectTrigger className="w-[140px] bg-secondary/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Chefe</SelectItem>
                              <SelectItem value="collaborator_admin">Colaborador</SelectItem>
                            </SelectContent>
                          </Select>
                          {admin.role === 'collaborator_admin' && (
                            <Button size="sm" variant="outline" onClick={() => { setEditingPermissions(admin.user_id); setEditPermValues(admin.permissions || { can_approve_barbers: false, can_suspend_barbers: false, can_view_emails: false, can_view_contacts: false, can_view_financials: false, can_manage_subscriptions: false }); }}>
                              <Settings2 className="mr-1 h-4 w-4" />Permissões
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {editingPermissions === admin.user_id && editPermValues && (
                      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                        <p className="text-sm font-medium">Permissões do Colaborador</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox checked={editPermValues[key]} onCheckedChange={(checked) => setEditPermValues(prev => prev ? { ...prev, [key]: !!checked } : prev)} />
                              {PERMISSION_LABELS[key]}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSavePermissions(admin.user_id, editPermValues)}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingPermissions(null); setEditPermValues(null); }}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                    {admin.role === 'collaborator_admin' && admin.permissions && editingPermissions !== admin.user_id && (
                      <div className="flex flex-wrap gap-1 pl-13">
                        {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                          admin.permissions?.[key] && <Badge key={key} variant="secondary" className="text-xs">{PERMISSION_LABELS[key]}</Badge>
                        ))}
                        {!Object.values(admin.permissions).some(v => v) && <span className="text-xs text-muted-foreground">Sem permissões configuradas</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Administrador</DialogTitle>
            <DialogDescription>Digite o email do usuário que deseja tornar administrador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email do usuário <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="adminEmail" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-secondary/50 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Administrador</Label>
              <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as any)}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Chefe — acesso total, pode gerenciar admins</SelectItem>
                  <SelectItem value="collaborator_admin">Colaborador — acesso ao painel, sem gerenciar admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newAdminRole === 'collaborator_admin' && (
              <div className="space-y-2">
                <Label>Permissões</Label>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                  {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={newAdminPermissions[key]} onCheckedChange={(checked) => setNewAdminPermissions(prev => ({ ...prev, [key]: !!checked }))} />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>Cancelar</Button>
            <Button variant="gold" onClick={handleAddAdmin} disabled={isAddingAdmin || !newAdminEmail.trim()}>
              {isAddingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
