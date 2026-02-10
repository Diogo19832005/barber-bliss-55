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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  { label: "Próximos", href: "/dashboard/upcoming", icon: <Clock className="h-4 w-4" /> },
  { label: "Ganhos", href: "/dashboard/earnings", icon: <DollarSign className="h-4 w-4" /> },
];

const bottomTabItems = [
  { label: "Agenda", href: "/dashboard", icon: <Calendar className="h-4 w-4" /> },
  { label: "Próximos", href: "/dashboard/upcoming", icon: <Clock className="h-4 w-4" /> },
  { label: "Ganhos", href: "/dashboard/earnings", icon: <DollarSign className="h-4 w-4" /> },
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
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [customEarnings, setCustomEarnings] = useState<number | null>(null);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

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
          setPublicLink(`https://barberoffice.online/${ownerData.slug_final}`);
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

  const calculateCustomEarnings = async () => {
    if (!profile?.id || !customDateFrom || !customDateTo) return;
    setIsLoadingCustom(true);
    const fromStr = format(customDateFrom, "yyyy-MM-dd");
    const toStr = format(customDateTo, "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .gte("appointment_date", fromStr)
      .lte("appointment_date", toStr)
      .eq("status", "completed");
    const total = data?.reduce((sum: number, item: any) => sum + (item.service?.price || 0), 0) || 0;
    setCustomEarnings(total);
    setIsLoadingCustom(false);
  };

  useEffect(() => {
    if (customDateFrom && customDateTo) {
      calculateCustomEarnings();
    } else {
      setCustomEarnings(null);
    }
  }, [customDateFrom, customDateTo]);

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
  const minDate = subMonths(new Date(), 13);

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
    <DashboardLayout navItems={navItems} bottomTabItems={bottomTabItems}>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.daily.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.weekly.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">R$ {earnings.monthly.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Custom Period Earnings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-primary" />
              Faturamento por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="mb-1 text-sm text-muted-foreground">De</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      disabled={(date) => date > new Date() || date < minDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-sm text-muted-foreground">Até</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      disabled={(date) => date > new Date() || date < minDate || (customDateFrom ? date < customDateFrom : false)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {customDateFrom && customDateTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCustomDateFrom(undefined); setCustomDateTo(undefined); }}
                >
                  Limpar
                </Button>
              )}
            </div>
            {customEarnings !== null && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {format(customDateFrom!, "dd/MM/yyyy")} — {format(customDateTo!, "dd/MM/yyyy")}
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {isLoadingCustom ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : `R$ ${customEarnings.toFixed(2)}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                {(() => {
                  const now = format(new Date(), "HH:mm:ss");
                  const nextApt = appointments.find(
                    (a) => a.status === "scheduled" && a.start_time >= now
                  );
                  return appointments.map((apt) => {
                    const isNext = nextApt?.id === apt.id;
                    return (
                      <div
                        key={apt.id}
                        className={`relative flex items-center justify-between rounded-xl border p-4 transition-all ${
                          apt.status === "completed"
                            ? "border-success/30 bg-success/5"
                            : apt.status === "cancelled"
                            ? "border-destructive/30 bg-destructive/5"
                            : isNext
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                            : "border-border"
                        }`}
                      >
                        {isNext && (
                          <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                            Próximo
                          </span>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className={`text-lg font-semibold ${isNext ? "text-primary" : ""}`}>
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
                            variant={isNext ? "default" : "outline"}
                            onClick={() => handleCompleteAppointment(apt.id)}
                          >
                            Concluir
                          </Button>
                        )}
                        {apt.status === "completed" && (
                          <span className="text-sm text-success">✓ Concluído</span>
                        )}
                      </div>
                    );
                  });
                })()}
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
