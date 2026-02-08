import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Link as LinkIcon, 
  Copy, 
  Check,
  MessageCircle,
  Loader2,
  Users,
  ArrowUpRight,
  Zap,
  Receipt
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import { getLocaleByCountry } from "@/lib/dateLocales";
import UpcomingAppointments from "./UpcomingAppointments";
import EarningsChart from "./EarningsChart";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";
import AppointmentManageModal from "@/components/dashboard/AppointmentManageModal";
import NextClientCard from "./NextClientCard";
import TodayAgendaList from "./TodayAgendaList";

interface DashboardHomeProps {
  barberId: string;
  widgets: string[];
  onCompleteAppointment?: (id: string) => void;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

const DashboardHome = ({ barberId, widgets, onCompleteAppointment }: DashboardHomeProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [lastWeekEarnings, setLastWeekEarnings] = useState(0);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);
  const [monthlyCompletedCount, setMonthlyCompletedCount] = useState(0);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [freeSlotCount, setFreeSlotCount] = useState(0);

  const today = new Date();
  const userLocale = getLocaleByCountry(profile?.pais);
  const formattedDate = format(today, "dd/MM", { locale: userLocale });
  const displayName = profile?.nome_exibido || profile?.full_name || "Barbeiro";

  useEffect(() => {
    if (barberId) {
      fetchData();
    }
  }, [barberId, widgets]);

  const fetchData = async () => {
    setIsLoading(true);

    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch today's appointments
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(full_name, phone),
        service:services(name, price)
      `)
      .eq("barber_id", barberId)
      .eq("appointment_date", todayStr)
      .order("start_time", { ascending: true });

    if (appointmentsData) {
      setTodayAppointments(appointmentsData as any);
      const completed = (appointmentsData as any[]).filter((a: any) => a.status === "completed");
      setTodayCompletedCount(completed.length);
    }

    // Fetch earnings
    await calculateEarnings();

    // Calculate free slots
    await calculateFreeSlots(todayStr);

    // Get public link
    if (profile?.slug_final) {
      const baseUrl = window.location.origin;
      setPublicLink(`${baseUrl}/${profile.slug_final}`);
    }

    setIsLoading(false);
  };

  const calculateFreeSlots = async (todayStr: string) => {
    // Get schedule for today's day of week
    const dayOfWeek = new Date().getDay();
    const { data: schedule } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", barberId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    if (!schedule) {
      setFreeSlotCount(0);
      return;
    }

    // Get all appointments for today
    const { data: apts } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("appointment_date", todayStr)
      .neq("status", "cancelled");

    // Simple estimate: count 30-min slots between schedule start/end minus booked slots
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const totalSlots = Math.floor((endMinutes - startMinutes) / 30);
    const bookedSlots = apts?.length || 0;
    setFreeSlotCount(Math.max(0, totalSlots - bookedSlots));
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const calculateEarnings = async () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    // Last week for comparison
    const lastWeekStart = format(startOfWeek(subDays(today, 7), { weekStartsOn: 0 }), "yyyy-MM-dd");
    const lastWeekEnd = format(endOfWeek(subDays(today, 7), { weekStartsOn: 0 }), "yyyy-MM-dd");

    const [dailyRes, weeklyRes, monthlyRes, lastWeekRes, monthlyCountRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("service:services(price)")
        .eq("barber_id", barberId)
        .eq("appointment_date", todayStr)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("service:services(price)")
        .eq("barber_id", barberId)
        .gte("appointment_date", weekStart)
        .lte("appointment_date", weekEnd)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("service:services(price)")
        .eq("barber_id", barberId)
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("service:services(price)")
        .eq("barber_id", barberId)
        .gte("appointment_date", lastWeekStart)
        .lte("appointment_date", lastWeekEnd)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("id")
        .eq("barber_id", barberId)
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .eq("status", "completed"),
    ]);

    const sumPrices = (data: any[]) =>
      data?.reduce((sum, item) => sum + (item.service?.price || 0), 0) || 0;

    const daily = sumPrices(dailyRes.data || []);
    const weekly = sumPrices(weeklyRes.data || []);
    const monthly = sumPrices(monthlyRes.data || []);
    const lastWeek = sumPrices(lastWeekRes.data || []);

    setEarnings({ daily, weekly, monthly });
    setLastWeekEarnings(lastWeek);
    setMonthlyCompletedCount(monthlyCountRes.data?.length || 0);
  };

  const weeklyVariation = lastWeekEarnings > 0
    ? Math.round(((earnings.weekly - lastWeekEarnings) / lastWeekEarnings) * 100)
    : earnings.weekly > 0 ? 100 : 0;

  const ticketMedio = monthlyCompletedCount > 0
    ? earnings.monthly / monthlyCompletedCount
    : 0;

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
      onCompleteAppointment?.(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Find next appointment
  const now = format(new Date(), "HH:mm:ss");
  const nextAppointment = todayAppointments.find(
    (a) => a.status === "scheduled" && a.start_time >= now
  );

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {displayName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumo da sua barbearia hoje – {formattedDate}
          </p>
        </div>
      </div>

      {/* Public Link */}
      {publicLink && widgets.includes("public_link") && (
        <Card className="glass-card border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                <LinkIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Seu Link Público</p>
                <p className="font-mono text-sm text-foreground break-all">{publicLink}</p>
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
                <><Check className="mr-2 h-4 w-4" />Copiado!</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" />Copiar Link</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Earnings Cards - Premium Design */}
      {widgets.includes("earnings") && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {/* Card 1: Faturamento de hoje */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] md:text-xs font-medium text-muted-foreground">Faturamento de hoje</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold tracking-tight">
                R$ {earnings.daily.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] md:text-xs text-muted-foreground">
                <span className="font-medium text-primary">{todayCompletedCount}</span> atendimentos
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Esta semana */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] md:text-xs font-medium text-muted-foreground">Esta semana</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold tracking-tight">
                R$ {earnings.weekly.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] md:text-xs">
                {weeklyVariation >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-success font-medium">
                    <ArrowUpRight className="h-3 w-3" />
                    {weeklyVariation}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-destructive font-medium">
                    ↓ {Math.abs(weeklyVariation)}%
                  </span>
                )}
                <span className="text-muted-foreground ml-1">vs semana passada</span>
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Este mês */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] md:text-xs font-medium text-muted-foreground">Este mês</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold tracking-tight">
                R$ {earnings.monthly.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] md:text-xs text-muted-foreground">
                Ticket médio <span className="font-medium text-foreground">R$ {ticketMedio.toFixed(2)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Client Card */}
      {widgets.includes("today_appointments") && nextAppointment && (
        <NextClientCard
          appointment={nextAppointment}
          onComplete={handleCompleteAppointment}
        />
      )}

      {/* Free Slots Indicator */}
      {widgets.includes("today_appointments") && (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-2.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {freeSlotCount > 0 ? (
              <>
                <span className="font-medium text-foreground">{freeSlotCount}</span> horários livres hoje
              </>
            ) : (
              "Nenhum horário livre hoje"
            )}
          </span>
        </div>
      )}

      {/* Today's Appointments */}
      {widgets.includes("today_appointments") && (
        <TodayAgendaList
          appointments={todayAppointments}
          onComplete={handleCompleteAppointment}
          onSelect={(apt) => {
            setSelectedAppointment({
              id: apt.id,
              clientName: apt.client?.full_name || "Cliente",
              serviceName: apt.service?.name || "",
              startTime: apt.start_time,
              date: format(new Date(), "d/MM"),
              paymentStatus: apt.payment_status,
            });
          }}
        />
      )}

      <AppointmentManageModal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onUpdated={fetchData}
      />

      {/* Upcoming Appointments */}
      {widgets.includes("upcoming_appointments") && (
        <UpcomingAppointments barberId={barberId} />
      )}

      {/* Analytics Chart */}
      {widgets.includes("analytics") && <EarningsChart barberId={barberId} />}
    </div>
  );
};

export default DashboardHome;
