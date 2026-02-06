import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "./DashboardLayout";
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import UpcomingAppointments from "./UpcomingAppointments";
import AccountPaused from "@/pages/AccountPaused";
import EarningsChart from "./EarningsChart";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

interface BarbershopOwner {
  id: string;
  full_name: string;
  nome_exibido: string | null;
  slug_final: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
}

const navItems = [
  { label: "Minha Agenda", href: "/dashboard", icon: <Calendar className="h-4 w-4" /> },
];

const RegularBarberDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [barbershopOwner, setBarbershopOwner] = useState<BarbershopOwner | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      checkSubscriptionStatus();
      fetchData();
    }
  }, [profile?.id]);

  const checkSubscriptionStatus = async () => {
    if (!profile?.barbershop_owner_id) {
      setIsCheckingStatus(false);
      return;
    }

    // Check the owner's subscription status
    const { data: subscription } = await supabase
      .from("barber_subscriptions")
      .select("payment_status")
      .eq("barber_id", profile.barbershop_owner_id)
      .maybeSingle();

    setIsPaused(subscription?.payment_status === "paused");
    setIsCheckingStatus(false);
  };

  const fetchData = async () => {
    if (!profile?.id) return;

    // Fetch barbershop owner info
    if (profile.barbershop_owner_id) {
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("id, full_name, nome_exibido, slug_final, logo_url, cor_primaria")
        .eq("id", profile.barbershop_owner_id)
        .maybeSingle();

      if (ownerData) {
        setBarbershopOwner(ownerData);
        if (ownerData.slug_final) {
          const baseUrl = window.location.origin;
          setPublicLink(`${baseUrl}/${ownerData.slug_final}`);
        }
      }
    }

    // Fetch today's appointments
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(full_name, phone),
        service:services(name, price)
      `)
      .eq("barber_id", profile.id)
      .eq("appointment_date", today)
      .order("start_time", { ascending: true });

    if (appointmentsData) setAppointments(appointmentsData as any);

    // Calculate earnings
    await calculateEarnings();
  };

  const calculateEarnings = async () => {
    if (!profile?.id) return;

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    const { data: dailyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .eq("appointment_date", todayStr)
      .eq("status", "completed");

    const { data: weeklyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd)
      .eq("status", "completed");

    const { data: monthlyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .gte("appointment_date", monthStart)
      .lte("appointment_date", monthEnd)
      .eq("status", "completed");

    const sumPrices = (data: any[]) =>
      data?.reduce((sum, item) => sum + (item.service?.price || 0), 0) || 0;

    setEarnings({
      daily: sumPrices(dailyData || []),
      weekly: sumPrices(weeklyData || []),
      monthly: sumPrices(monthlyData || []),
    });
  };

  const handleCompleteAppointment = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Atendimento concluído!" });
      fetchData();
    }
  };

  const displayName = profile?.full_name?.split(" ")[0];
  const ownerDisplayName = barbershopOwner?.nome_exibido || barbershopOwner?.full_name;
  const primaryColor = barbershopOwner?.cor_primaria || "#D97706";

  if (isCheckingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPaused) {
    return <AccountPaused />;
  }

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {barbershopOwner?.logo_url ? (
              <img
                src={barbershopOwner.logo_url}
                alt="Logo"
                className="h-14 w-14 rounded-xl object-cover border border-border"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {ownerDisplayName?.charAt(0).toUpperCase() || displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Olá, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Equipe {ownerDisplayName || "Barbearia"} •{" "}
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Public Link Card */}
        {publicLink && (
          <Card className="glass-card border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Link da Barbearia
                  </p>
                  <p className="font-mono text-sm text-foreground break-all">
                    {publicLink}
                  </p>
                </div>
              </div>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicLink);
                  setLinkCopied(true);
                  toast({ title: "Link copiado!" });
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
              >
                {linkCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hoje
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.daily.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Esta Semana
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.weekly.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.monthly.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Minha Agenda de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum agendamento para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`flex items-center justify-between rounded-xl border p-4 ${
                      apt.status === "completed"
                        ? "border-success/30 bg-success/5"
                        : apt.status === "cancelled"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {apt.start_time.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{apt.client?.full_name}</p>
                          {apt.client?.phone && (
                            <a
                              href={`https://wa.me/${apt.client.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success hover:bg-success/30 transition-colors"
                              title="Enviar mensagem no WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {apt.service?.name} • R$ {apt.service?.price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {apt.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteAppointment(apt.id)}
                      >
                        Concluir
                      </Button>
                    )}
                    {apt.status === "completed" && (
                      <span className="text-sm text-success">✓ Concluído</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <UpcomingAppointments barberId={profile?.id || ""} />

        {/* Analytics */}
        <EarningsChart barberId={profile?.id || ""} />
      </div>
    </DashboardLayout>
  );
};

export default RegularBarberDashboard;
