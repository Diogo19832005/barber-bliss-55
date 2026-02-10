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
import { getLocaleByCountry } from "@/lib/dateLocales";
import UpcomingAppointments from "./UpcomingAppointments";
import EarningsChart from "./EarningsChart";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";
import AppointmentManageModal from "@/components/dashboard/AppointmentManageModal";

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
  payment_status: string;
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
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const today = new Date();
  const userLocale = getLocaleByCountry(profile?.pais);
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: userLocale });
  const displayName = profile?.nome_exibido || profile?.full_name || "Barbeiro";

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
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (appointmentsData) setTodayAppointments(appointmentsData as any);
    }

    // Fetch earnings if widget is enabled
    if (widgets.includes("earnings")) {
      await calculateEarnings();
    }

    // Get public link
    if (profile?.slug_final) {
      setPublicLink(`https://barberoffice.online/${profile.slug_final}`);
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
    <div className="space-y-4 md:space-y-6">
      {/* Greeting Section */}
      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-base md:text-xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-lg md:text-2xl font-bold">
            Olá, {displayName}! 👋
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground capitalize">{formattedDate}</p>
        </div>
      </div>

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
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="glass-card">
            <CardContent className="p-2.5 md:p-6">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Hoje</p>
                <DollarSign className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
              </div>
              <p className="text-sm md:text-2xl font-bold">R$ {earnings.daily.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2.5 md:p-6">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Semana</p>
                <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-success" />
              </div>
              <p className="text-sm md:text-2xl font-bold">R$ {earnings.weekly.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2.5 md:p-6">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Mês</p>
                <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
              </div>
              <p className="text-sm md:text-2xl font-bold">R$ {earnings.monthly.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Appointments */}
      {widgets.includes("today_appointments") && (
        <Card className="glass-card">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Agenda de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum agendamento para hoje
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {(() => {
                  const now = format(new Date(), "HH:mm:ss");
                  const nextApt = todayAppointments.find(
                    (a) => a.status === "scheduled" && a.start_time >= now
                  );
                  return todayAppointments.map((apt) => {
                    const isNext = nextApt?.id === apt.id;
                    return (
                      <div
                         key={apt.id}
                         className={`relative rounded-xl border p-3 md:p-4 transition-all cursor-pointer hover:border-primary/40 ${
                           apt.status === "completed"
                             ? "border-success/30 bg-success/5"
                             : apt.status === "cancelled"
                             ? "border-destructive/30 bg-destructive/5"
                             : isNext
                             ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                             : "border-border"
                         }`}
                         onClick={() => {
                           setSelectedAppointment({
                             id: apt.id,
                             clientName: apt.client?.full_name || (apt as any).client_name || "Cliente",
                             serviceName: apt.service?.name || "",
                             startTime: apt.start_time,
                             date: format(new Date(), "d/MM"),
                             paymentStatus: apt.payment_status,
                           });
                         }}
                       >
                         {isNext && (
                           <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                             Próximo
                           </span>
                         )}
                         <div className="flex items-start gap-3">
                           <div className="text-center shrink-0">
                             <p className={`text-base md:text-lg font-semibold ${isNext ? "text-primary" : ""}`}>
                               {apt.start_time.slice(0, 5)}
                             </p>
                             <p className="text-[10px] md:text-xs text-muted-foreground">{apt.end_time.slice(0, 5)}</p>
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <p className="text-sm font-medium truncate">
                                   {apt.client?.full_name || (apt as any).client_name || "Cliente"}
                                 </p>
                                 {(apt.client?.phone || (apt as any).client_phone) && (
                                   <a
                                     href={`https://wa.me/${(apt.client?.phone || (apt as any).client_phone || "").replace(/\D/g, "")}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success hover:bg-success/30 transition-colors"
                                     title="Enviar mensagem no WhatsApp"
                                     onClick={(e) => e.stopPropagation()}
                                   >
                                     <MessageCircle className="h-3 w-3" />
                                     WhatsApp
                                   </a>
                                 )}
                               </div>
                               <p className="text-xs md:text-sm text-muted-foreground truncate">
                                 {apt.service?.name?.toUpperCase()} • R$ {apt.service?.price?.toFixed(2)}
                               </p>
                             </div>
                             <div className="flex items-center justify-between mt-1.5">
                               <PaymentStatusBadge status={apt.payment_status} />
                               {apt.status === "completed" && (
                                 <span className="text-sm text-success">✓ Concluído</span>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Services */}
      {widgets.includes("services") && (
        <Card className="glass-card">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Scissors className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Meus Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum serviço cadastrado
              </p>
            ) : (
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                {services.slice(0, 6).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 md:p-4"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-secondary shrink-0">
                          <Scissors className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm md:text-base font-medium truncate">{service.name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {service.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <p className="text-sm md:text-lg font-semibold text-primary whitespace-nowrap shrink-0">
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
