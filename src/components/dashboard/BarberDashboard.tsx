import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "./DashboardLayout";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Scissors, 
  Users,
  TrendingUp,
  Plus,
  Edit2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceModal from "./ServiceModal";
import ScheduleModal from "./ScheduleModal";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client: { full_name: string } | null;
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
  { label: "Visão Geral", href: "/dashboard", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Agenda", href: "/dashboard/agenda", icon: <Calendar className="h-4 w-4" /> },
  { label: "Serviços", href: "/dashboard/services", icon: <Scissors className="h-4 w-4" /> },
  { label: "Horários", href: "/dashboard/schedule", icon: <Clock className="h-4 w-4" /> },
];

const BarberDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [earnings, setEarnings] = useState({ daily: 0, weekly: 0, monthly: 0 });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

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
        client:profiles!appointments_client_id_fkey(full_name),
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

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Olá, {profile?.full_name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

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

        {/* Today's Appointments */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agenda de Hoje
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
                        <p className="font-medium">{apt.client?.full_name}</p>
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

        {/* Services */}
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
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration_minutes} min • R$ {Number(service.price).toFixed(2)}
                      </p>
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

        {/* Work Schedule */}
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
            <div className="grid grid-cols-7 gap-2">
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
                        {schedule.start_time.slice(0, 5)}
                        <br />
                        {schedule.end_time.slice(0, 5)}
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
    </DashboardLayout>
  );
};

export default BarberDashboard;
