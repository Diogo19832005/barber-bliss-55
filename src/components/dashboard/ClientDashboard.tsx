import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "./DashboardLayout";
import { Calendar, Scissors, Clock, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import BookingModal from "./BookingModal";
import { useToast } from "@/hooks/use-toast";

interface Barber {
  id: string;
  full_name: string;
  avatar_url: string | null;
  services: Service[];
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  barber: { full_name: string } | null;
  service: { name: string; price: number } | null;
}

const navItems = [
  { label: "Início", href: "/dashboard", icon: <Scissors className="h-4 w-4" /> },
  { label: "Meus Agendamentos", href: "/dashboard/appointments", icon: <Calendar className="h-4 w-4" /> },
];

const ClientDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    // Get the barbershop context from last visited public link
    const lastBarbershopId = localStorage.getItem("last_barbershop_id");

    if (lastBarbershopId) {
      // Fetch the barbershop owner
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", lastBarbershopId)
        .eq("role", "barber")
        .eq("barber_status", "approved")
        .maybeSingle();

      // Fetch team members of this barbershop
      const { data: teamData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("barbershop_owner_id", lastBarbershopId)
        .eq("role", "barber")
        .eq("barber_status", "approved");

      const allBarbers = [
        ...(ownerData ? [ownerData] : []),
        ...(teamData || []),
      ];

      // Fetch services for each barber
      const barbersWithServices = await Promise.all(
        allBarbers.map(async (barber) => {
          // For team members, use the owner's services
          const serviceOwnerId = barber.id === lastBarbershopId ? barber.id : lastBarbershopId;
          const { data: services } = await supabase
            .from("services")
            .select("id, name, duration_minutes, price")
            .eq("barber_id", serviceOwnerId)
            .eq("is_active", true);

          return { ...barber, services: services || [] };
        })
      );

      setBarbers(barbersWithServices);
    } else {
      // No barbershop context - don't fetch any barbers
      setBarbers([]);
    }

    // Fetch user's appointments
    if (profile?.id) {
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`
          *,
          barber:profiles!appointments_barber_id_fkey(full_name),
          service:services(name, price)
        `)
        .eq("client_id", profile.id)
        .gte("appointment_date", format(new Date(), "yyyy-MM-dd"))
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (appointmentsData) setAppointments(appointmentsData as any);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Agendamento cancelado" });
      fetchData();
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Olá, {profile?.full_name?.split(" ")[0]}! ✂️
          </h1>
          <p className="text-muted-foreground">
            Escolha um barbeiro e agende seu horário
          </p>
        </div>

        {/* My Appointments */}
        {appointments.filter((a) => a.status === "scheduled").length > 0 && (
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximos Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments
                .filter((a) => a.status === "scheduled")
                .slice(0, 3)
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{apt.service?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(apt.appointment_date), "dd/MM")} às{" "}
                          {apt.start_time.slice(0, 5)} • {apt.barber?.full_name}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleCancelAppointment(apt.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Available Barbers */}
        {!localStorage.getItem("last_barbershop_id") ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <Scissors className="mx-auto h-14 w-14 text-muted-foreground/50" />
              <h2 className="mt-4 text-lg font-semibold">Nenhuma barbearia vinculada</h2>
              <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                Peça ao seu barbeiro para enviar o link dele para você poder agendar seus horários.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              Barbeiros — {localStorage.getItem("last_barbershop_name")}
            </h2>
            {barbers.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Scissors className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    Nenhum barbeiro disponível no momento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {barbers.map((barber) => (
                  <Card key={barber.id} className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                          {barber.avatar_url ? (
                            <img
                              src={barber.avatar_url}
                              alt={barber.full_name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{barber.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {barber.services.length} serviço(s)
                          </p>
                        </div>
                      </div>

                      {barber.services.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {barber.services.slice(0, 3).map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                {service.name}
                              </span>
                              <span className="font-medium">
                                R$ {Number(service.price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="gold"
                        className="mt-4 w-full"
                        onClick={() => {
                          setSelectedBarber(barber);
                          setIsBookingOpen(true);
                        }}
                        disabled={barber.services.length === 0}
                      >
                        {barber.services.length === 0
                          ? "Sem serviços"
                          : "Agendar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedBarber && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            setSelectedBarber(null);
          }}
          onSuccess={fetchData}
          barber={selectedBarber}
          clientId={profile?.id || ""}
        />
      )}
    </DashboardLayout>
  );
};

export default ClientDashboard;
