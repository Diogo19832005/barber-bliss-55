import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Calendar, Search, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  service: { name: string; price: number } | null;
  status: string;
}

interface ClientData {
  id: string;
  full_name: string;
  phone: string | null;
  appointments: ClientAppointment[];
  totalAppointments: number;
  completedAppointments: number;
}

interface ClientsHistoryProps {
  barberId: string;
}

const ClientsHistory = ({ barberId }: ClientsHistoryProps) => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    if (barberId) {
      fetchClientsHistory();
    }
  }, [barberId]);

  const fetchClientsHistory = async () => {
    setIsLoading(true);

    // Fetch all appointments for this barber with client info
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        client_id,
        client:profiles!appointments_client_id_fkey(id, full_name, phone),
        service:services(name, price)
      `)
      .eq("barber_id", barberId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching clients history:", error);
      setIsLoading(false);
      return;
    }

    // Group appointments by client
    const clientsMap = new Map<string, ClientData>();

    appointments?.forEach((apt) => {
      const client = apt.client as { id: string; full_name: string; phone: string | null } | null;
      if (!client) return;

      const clientId = client.id;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          id: clientId,
          full_name: client.full_name,
          phone: client.phone,
          appointments: [],
          totalAppointments: 0,
          completedAppointments: 0,
        });
      }

      const clientData = clientsMap.get(clientId)!;
      clientData.appointments.push({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        service: apt.service as { name: string; price: number } | null,
        status: apt.status,
      });
      clientData.totalAppointments++;
      if (apt.status === "completed") {
        clientData.completedAppointments++;
      }
    });

    // Convert to array and sort by total appointments
    const clientsArray = Array.from(clientsMap.values()).sort(
      (a, b) => b.totalAppointments - a.totalAppointments
    );

    setClients(clientsArray);
    setIsLoading(false);
  };

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-xs">Cancelado</Badge>;
      case "scheduled":
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Agendado</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Meus Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Meus Clientes
          <Badge variant="secondary" className="ml-2">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="rounded-xl border border-border bg-card/50 overflow-hidden"
              >
                {/* Client Header */}
                <button
                  type="button"
                  onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {client.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{client.full_name}</p>
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {client.completedAppointments}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.completedAppointments === 1 ? "corte" : "cortes"}
                      </p>
                    </div>
                    {expandedClient === client.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Appointments List (Expanded) */}
                {expandedClient === client.id && (
                  <div className="border-t border-border bg-secondary/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Histórico de agendamentos ({client.totalAppointments})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {client.appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg p-3",
                            apt.status === "cancelled" 
                              ? "bg-destructive/10" 
                              : apt.status === "completed"
                              ? "bg-success/10"
                              : "bg-primary/10"
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {formatDate(apt.appointment_date)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {apt.start_time.slice(0, 5)} • {apt.service?.name || "Serviço não especificado"}
                            </span>
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientsHistory;
