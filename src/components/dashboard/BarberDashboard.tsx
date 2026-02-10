import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "./DashboardLayout";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Scissors, 
  Users,
  User,
  UserCheck,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Copy,
  Check,
  Settings,
  Loader2,
  MessageCircle,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceModal from "./ServiceModal";
import BarberCreateAppointmentModal from "./BarberCreateAppointmentModal";
import ScheduleModal from "./ScheduleModal";
import SettingsModal from "./SettingsModal";
import TeamManagement from "./TeamManagement";
import { useToast } from "@/hooks/use-toast";
import UpcomingAppointments from "./UpcomingAppointments";
import SubscriptionAlert from "./SubscriptionAlert";
import AccountPaused from "@/pages/AccountPaused";
import EarningsChart from "./EarningsChart";
import DashboardHome from "./DashboardHome";
import DataExport from "./DataExport";
import ClientsHistory from "./ClientsHistory";
import ServiceHistory from "./ServiceHistory";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";

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
  created_by: string | null;
  client_name: string | null;
  client_phone: string | null;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const navItems = [
  { label: "Página Inicial", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
  { label: "Dashboard", href: "/dashboard/analytics", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Agenda", href: "/dashboard/agenda", icon: <Calendar className="h-4 w-4" /> },
  { label: "Histórico", href: "/dashboard/history", icon: <History className="h-4 w-4" /> },
  { label: "Clientes", href: "/dashboard/clients", icon: <UserCheck className="h-4 w-4" /> },
  { label: "Serviços", href: "/dashboard/services", icon: <Scissors className="h-4 w-4" /> },
  { label: "Horários", href: "/dashboard/schedule", icon: <Clock className="h-4 w-4" /> },
  { label: "Equipe", href: "/dashboard/team", icon: <Users className="h-4 w-4" /> },
  { label: "Meu Perfil", href: "/dashboard/profile", icon: <User className="h-4 w-4" /> },
];

const bottomTabItems = [
  { label: "Início", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
  { label: "Agenda", href: "/dashboard/agenda", icon: <Calendar className="h-4 w-4" /> },
  { label: "Clientes", href: "/dashboard/clients", icon: <UserCheck className="h-4 w-4" /> },
];

const BarberDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { profile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [earnings, setEarnings] = useState({ daily: 0, weekly: 0, monthly: 0 });
   const [publicLink, setPublicLink] = useState<string | null>(null);
   const [linkCopied, setLinkCopied] = useState(false);
   const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
   const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);
   
   const [isPaused, setIsPaused] = useState<boolean | null>(null);
   const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      checkSubscriptionStatus();
      fetchData();
    }
  }, [profile?.id]);

  const checkSubscriptionStatus = async () => {
    if (!profile?.id) return;
    
    setIsCheckingStatus(true);
    const { data: subscription } = await supabase
      .from("barber_subscriptions")
      .select("payment_status")
      .eq("barber_id", profile.id)
      .maybeSingle();
    
    setIsPaused(subscription?.payment_status === "paused");
    setIsCheckingStatus(false);
  };

  const fetchData = async () => {
    if (!profile?.id) return;

    // Fetch services
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", profile.id)
      .order("created_at", { ascending: false });

    if (servicesData) setServices(servicesData);

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

    // Fetch schedules
    const { data: schedulesData } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", profile.id)
      .order("day_of_week", { ascending: true });

    if (schedulesData) setSchedules(schedulesData);

     // Get public link
      if (profile.slug_final) {
        setPublicLink(`https://barberoffice.online/${profile.slug_final}`);
      }
 
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

    // Daily earnings
    const { data: dailyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .eq("appointment_date", todayStr)
      .eq("status", "completed");

    // Weekly earnings
    const { data: weeklyData } = await supabase
      .from("appointments")
      .select("service:services(price)")
      .eq("barber_id", profile.id)
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd)
      .eq("status", "completed");

    // Monthly earnings
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

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Serviço excluído" });
      fetchData();
    }
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

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

   const displayName = profile?.nome_exibido || profile?.full_name?.split(" ")[0];
   const primaryColor = profile?.cor_primaria || "#D97706";
 
  // Show loading while checking status
  if (isCheckingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show paused page if account is paused
  if (isPaused) {
    return <AccountPaused />;
  }

  // Get dashboard home widgets from profile
  const dashboardWidgets = (profile?.dashboard_home_widgets as string[]) || [
    "today_appointments",
    "upcoming_appointments", 
    "services"
  ];

  // Check if we're on the main dashboard page (home) vs a specific section
  const isHomePage = currentPath === "/dashboard" || currentPath === "/dashboard/";
  const isProfilePage = currentPath === "/dashboard/profile";
  const isAnalyticsPage = currentPath === "/dashboard/analytics";
  const isAgendaPage = currentPath === "/dashboard/agenda";
  const isClientsPage = currentPath === "/dashboard/clients";
  const isServicesPage = currentPath === "/dashboard/services";
  const isSchedulePage = currentPath === "/dashboard/schedule";
  const isTeamPage = currentPath === "/dashboard/team";
  const isHistoryPage = currentPath === "/dashboard/history";

  return (
    <DashboardLayout navItems={navItems} bottomTabItems={bottomTabItems}>
      <div className="space-y-6">
        {/* Meu Perfil Page - Subscription Alert, Header and Public Link */}
        {isProfilePage && (
          <>
            {/* Subscription Alert */}
            <SubscriptionAlert barberId={profile?.id || ""} />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Logo"
                    className="h-14 w-14 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div 
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-xl"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {displayName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold md:text-3xl">
                    Olá, {displayName}! 👋
                  </h1>
                  <p className="text-muted-foreground">
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSettingsModalOpen(true)}
                title="Configurações"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Public Link Card */}
            {publicLink && (
              <Card className="glass-card border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shrink-0">
                      <LinkIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground">Seu Link Público</p>
                      <p className="font-mono text-[11px] text-foreground break-all leading-tight">{publicLink}</p>
                    </div>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    className="shrink-0 h-8 text-xs px-2.5"
                    onClick={() => {
                      navigator.clipboard.writeText(publicLink);
                      setLinkCopied(true);
                      toast({ title: "Link copiado!" });
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Customizable Home Page */}
        {isHomePage && (
          <DashboardHome
            barberId={profile?.id || ""}
            widgets={dashboardWidgets}
            onCompleteAppointment={() => fetchData()}
          />
        )}

         {/* Dashboard/Analytics Page - Only charts and performance metrics */}
          {isAnalyticsPage && (
            <>
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
                    <p className="text-2xl font-bold">
                      R$ {earnings.daily.toFixed(2)}
                    </p>
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
                    <p className="text-2xl font-bold">
                      R$ {earnings.weekly.toFixed(2)}
                    </p>
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
                    <p className="text-2xl font-bold">
                      R$ {earnings.monthly.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Charts */}
              <EarningsChart barberId={profile?.id || ""} />

              {/* Data Export */}
              <DataExport barberId={profile?.id || ""} />
            </>
          )}

          {/* Clients Page - Client History */}
          {isClientsPage && (
            <ClientsHistory barberId={profile?.id || ""} />
          )}

          {/* Agenda Page - Today's Appointments and Upcoming */}
          {isAgendaPage && (
            <>
              {/* Create Appointment Button */}
              <div className="flex justify-end">
                <Button variant="gold" size="sm" className="md:size-default" onClick={() => setIsCreateAppointmentOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar Agendamento
                </Button>
              </div>

              {/* Today's Appointments */}
              <Card className="glass-card">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Agenda de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      Nenhum agendamento para hoje
                    </p>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
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
                              className={`relative rounded-xl border p-3 md:p-4 transition-all ${
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
                              <div className="flex items-start gap-3">
                                <div className="text-center shrink-0">
                                  <p className={`text-base md:text-lg font-semibold ${isNext ? "text-primary" : ""}`}>
                                    {apt.start_time.slice(0, 5)}
                                  </p>
                                  <p className="text-[10px] md:text-xs text-muted-foreground">
                                    {apt.end_time.slice(0, 5)}
                                  </p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{apt.client?.full_name || apt.client_name || "Cliente avulso"}</p>
                                    {apt.created_by && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Feito por você</Badge>
                                    )}
                                    {apt.client?.phone && (
                                      <a
                                        href={`https://wa.me/${apt.client.phone.replace(/\D/g, '')}`}
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
                                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                                    {apt.service?.name} • R$ {apt.service?.price?.toFixed(2)}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <PaymentStatusBadge status={apt.payment_status} />
                                    {apt.status === "completed" && (
                                      <span className="text-xs text-success">✓ Concluído</span>
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

              {/* Upcoming Appointments */}
              <UpcomingAppointments barberId={profile?.id || ""} />
            </>
          )}

          {/* Services Page */}
          {isServicesPage && (
           <Card className="glass-card">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="flex items-center gap-2">
                 <Scissors className="h-5 w-5 text-primary" />
                 Meus Serviços
               </CardTitle>
               <Button
                 variant="gold"
                 size="sm"
                 onClick={() => {
                   setEditingService(null);
                   setIsServiceModalOpen(true);
                 }}
               >
                 <Plus className="h-4 w-4" />
                 Adicionar
               </Button>
             </CardHeader>
             <CardContent>
               {services.length === 0 ? (
                 <p className="py-8 text-center text-muted-foreground">
                   Nenhum serviço cadastrado
                 </p>
               ) : (
                 <div className="grid gap-3 md:grid-cols-2">
                   {services.map((service) => (
                     <div
                       key={service.id}
                       className="flex items-center justify-between rounded-xl border border-border p-4"
                     >
                       <div className="flex items-center gap-3">
                         {service.image_url ? (
                           <img
                             src={service.image_url}
                             alt={service.name}
                             className="h-14 w-14 rounded-lg object-cover border border-border"
                           />
                         ) : (
                           <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary">
                             <Scissors className="h-6 w-6 text-muted-foreground" />
                           </div>
                         )}
                         <div>
                           <p className="font-medium">{service.name}</p>
                           <p className="text-sm text-muted-foreground">
                             {service.duration_minutes} min • R$ {Number(service.price).toFixed(2)}
                           </p>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <Button
                           size="icon"
                           variant="ghost"
                           onClick={() => {
                             setEditingService(service);
                             setIsServiceModalOpen(true);
                           }}
                         >
                           <Edit2 className="h-4 w-4" />
                         </Button>
                         <Button
                           size="icon"
                           variant="ghost"
                           className="text-destructive hover:text-destructive"
                           onClick={() => handleDeleteService(service.id)}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
         )}

         {/* Schedule Page */}
         {isSchedulePage && (
           <Card className="glass-card">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="flex items-center gap-2">
                 <Clock className="h-5 w-5 text-primary" />
                 Horários de Trabalho
               </CardTitle>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setIsScheduleModalOpen(true)}
               >
                 Editar
               </Button>
             </CardHeader>
             <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const schedule = schedules.find((s) => s.day_of_week === day);
                    return (
                      <div
                        key={day}
                        className={`rounded-lg p-3 text-center ${
                          schedule?.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <p className="text-xs font-medium">{dayNames[day]}</p>
                        {schedule?.is_active ? (
                          <p className="mt-1 text-xs">
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
             </CardContent>
           </Card>
         )}

         {/* History Page */}
         {isHistoryPage && profile?.id && (
           <ServiceHistory barberId={profile.id} />
         )}

         {/* Team Page - Only for barbershop admins */}
         {isTeamPage && profile?.is_barbershop_admin && (
           <TeamManagement barbershopOwnerId={profile.id} />
         )}
       </div>

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        onSuccess={fetchData}
        service={editingService}
        barberId={profile?.id || ""}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={fetchData}
        schedules={schedules}
        barberId={profile?.id || ""}
      />
       
       {profile && (
         <SettingsModal
           isOpen={isSettingsModalOpen}
           onClose={() => setIsSettingsModalOpen(false)}
           onSuccess={fetchData}
          profile={{
             id: profile.id,
             user_id: profile.user_id,
             full_name: profile.full_name,
             nome_exibido: profile.nome_exibido,
             logo_url: profile.logo_url,
             cor_primaria: profile.cor_primaria,
             cor_secundaria: profile.cor_secundaria,
             phone: profile.phone,
             endereco: profile.endereco,
             cidade: profile.cidade,
             estado: profile.estado,
             hero_enabled: profile.hero_enabled ?? true,
             hero_button_text: profile.hero_button_text || "Agendar agora mesmo",
             hero_button_color: profile.hero_button_color || "#D97706",
             hero_animation_speed: profile.hero_animation_speed ?? 1.0,
              hero_services_title: profile.hero_services_title || "Meus Serviços",
              dashboard_home_widgets: profile.dashboard_home_widgets || ["today_appointments", "upcoming_appointments", "services"],
              appointment_message: profile.appointment_message,
              pix_key: profile.pix_key,
              pix_qr_code: profile.pix_qr_code,
            }}
          />
       )}

        {/* Barber Create Appointment Modal */}
        <BarberCreateAppointmentModal
          isOpen={isCreateAppointmentOpen}
          onClose={() => setIsCreateAppointmentOpen(false)}
          onSuccess={() => fetchData()}
          barberId={profile?.id || ""}
        />

    </DashboardLayout>
  );
};

export default BarberDashboard;
