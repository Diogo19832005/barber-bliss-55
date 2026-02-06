import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Calendar, Search, ChevronDown, ChevronUp, Phone, Medal, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ClientCard from "./clients/ClientCard";

interface ClientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  service: { name: string; price: number } | null;
  status: string;
}

export interface ClientData {
  id: string;
  full_name: string;
  phone: string | null;
  appointments: ClientAppointment[];
  totalAppointments: number;
  completedAppointments: number;
  firstAppointmentDate: string | null;
}

interface ClientsHistoryProps {
  barberId: string;
}

type SortOption = "alphabetical" | "newest" | "oldest" | "most_cuts" | "least_cuts";

const SORT_LABELS: Record<SortOption, string> = {
  alphabetical: "Ordem alfabética",
  newest: "Mais recente",
  oldest: "Mais antigo",
  most_cuts: "Mais cortes",
  least_cuts: "Menos cortes",
};

const ClientsHistory = ({ barberId }: ClientsHistoryProps) => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("most_cuts");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    if (barberId) {
      fetchClientsHistory();
    }
  }, [barberId]);

  const fetchClientsHistory = async () => {
    setIsLoading(true);

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
          firstAppointmentDate: null,
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

      // Track first appointment date (appointments are desc, so last processed is earliest)
      if (!clientData.firstAppointmentDate || apt.appointment_date < clientData.firstAppointmentDate) {
        clientData.firstAppointmentDate = apt.appointment_date;
      }
    });

    setClients(Array.from(clientsMap.values()));
    setIsLoading(false);
  };

  // Generate available months from appointment data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    clients.forEach((client) => {
      client.appointments.forEach((apt) => {
        const month = apt.appointment_date.substring(0, 7); // YYYY-MM
        months.add(month);
      });
    });
    return Array.from(months).sort().reverse();
  }, [clients]);

  // Filter and sort clients
  const processedClients = useMemo(() => {
    let filtered = clients;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) => c.full_name.toLowerCase().includes(term) || c.phone?.includes(searchTerm)
      );
    }

    // Month filter - recalculate completedAppointments for the selected month
    if (selectedMonth !== "all") {
      filtered = filtered
        .map((client) => {
          const monthAppointments = client.appointments.filter(
            (apt) => apt.appointment_date.startsWith(selectedMonth)
          );
          if (monthAppointments.length === 0) return null;
          return {
            ...client,
            appointments: monthAppointments,
            totalAppointments: monthAppointments.length,
            completedAppointments: monthAppointments.filter((a) => a.status === "completed").length,
          };
        })
        .filter(Boolean) as ClientData[];
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case "alphabetical":
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case "newest":
        sorted.sort((a, b) => {
          const dateA = a.appointments[0]?.appointment_date || "";
          const dateB = b.appointments[0]?.appointment_date || "";
          return dateB.localeCompare(dateA);
        });
        break;
      case "oldest":
        sorted.sort((a, b) => {
          const dateA = a.firstAppointmentDate || "";
          const dateB = b.firstAppointmentDate || "";
          return dateA.localeCompare(dateB);
        });
        break;
      case "most_cuts":
        sorted.sort((a, b) => b.completedAppointments - a.completedAppointments);
        break;
      case "least_cuts":
        sorted.sort((a, b) => a.completedAppointments - b.completedAppointments);
        break;
    }

    return sorted;
  }, [clients, searchTerm, sortBy, selectedMonth]);

  // Top 10 ranking (always based on all-time data, not filtered by month)
  const top10Map = useMemo(() => {
    const ranked = [...clients]
      .sort((a, b) => b.completedAppointments - a.completedAppointments)
      .slice(0, 10);
    const map = new Map<string, number>();
    ranked.forEach((c, i) => {
      if (c.completedAppointments > 0) {
        map.set(c.id, i + 1);
      }
    });
    return map;
  }, [clients]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, "MMMM yyyy", { locale: ptBR });
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
            {processedClients.length} {processedClients.length === 1 ? "cliente" : "clientes"}
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clients List */}
        {processedClients.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {searchTerm || selectedMonth !== "all"
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente ainda"}
          </p>
        ) : (
          <div className="space-y-3">
            {processedClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                isExpanded={expandedClient === client.id}
                onToggle={() =>
                  setExpandedClient(expandedClient === client.id ? null : client.id)
                }
                rankPosition={top10Map.get(client.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientsHistory;
