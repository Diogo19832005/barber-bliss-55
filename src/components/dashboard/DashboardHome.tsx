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
  Scissors, 
  TrendingUp, 
  Link as LinkIcon, 
  Copy, 
  Check,
  MessageCircle,
  Loader2 
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import UpcomingAppointments from "./UpcomingAppointments";
import EarningsChart from "./EarningsChart";

interface DashboardHomeProps {
  barberId: string;
  widgets: string[];
  onCompleteAppointment?: (id: string) => void;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  image_url?: string | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

const DashboardHome = ({ barberId, widgets, onCompleteAppointment }: DashboardHomeProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (barberId) {
      fetchData();
    }
  }, [barberId, widgets]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch services if widget is enabled
    if (widgets.includes("services")) {
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("barber_id", barberId)
        .order("created_at", { ascending: false });

      if (servicesData) setServices(servicesData);
    }

    // Fetch today's appointments if widget is enabled
    if (widgets.includes("today_appointments")) {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`
          *,
          client:profiles!appointments_client_id_fkey(full_name, phone),
          service:services(name, price)
        `)
        .eq("barber_id", barberId)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true });

      if (appointmentsData) setTodayAppointments(appointmentsData as any);
    }

    // Fetch earnings if widget is enabled
    if (widgets.includes("earnings")) {
      await calculateEarnings();
    }

    // Get public link
    if (profile?.slug_final) {
      const baseUrl = window.location.origin;
      setPublicLink(`${baseUrl}/${profile.slug_final}`);
    }

    setIsLoading(false);
  };

  const calculateEarnings = async () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    const { data: dailyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", barberId)
      .eq("appointment_date", todayStr)
      .eq("status", "completed");

    const { data: weeklyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", barberId)
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd)
      .eq("status", "completed");

    const { data: monthlyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", barberId)
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

  return (
    <div className="space-y-6">
      {/* Public Link */}
      {publicLink && widgets.includes("public_link") && (
        <Card className="glass-card border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
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

      {/* Earnings Cards */}
      {widgets.includes("earnings") && (
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
      )}

      {/* Today's Appointments */}
      {widgets.includes("today_appointments") && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agenda de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum agendamento para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
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
                        <p className="text-lg font-semibold">{apt.start_time.slice(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">{apt.end_time.slice(0, 5)}</p>
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
      )}

      {/* Upcoming Appointments */}
      {widgets.includes("upcoming_appointments") && (
        <UpcomingAppointments barberId={barberId} />
      )}

      {/* Analytics Chart */}
      {widgets.includes("analytics") && <EarningsChart barberId={barberId} />}

      {/* Services */}
      {widgets.includes("services") && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Meus Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum serviço cadastrado
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {services.slice(0, 6).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="h-12 w-12 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                          <Scissors className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {service.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      R$ {Number(service.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardHome;
