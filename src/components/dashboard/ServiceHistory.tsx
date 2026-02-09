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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { History, Search, CalendarRange, X, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HistoryAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  client: { full_name: string; phone: string | null } | null;
  service: { name: string; price: number } | null;
}

interface ServiceHistoryProps {
  barberId: string;
}

type StatusFilter = "all" | "completed" | "cancelled" | "no_show";

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
  scheduled: "Agendado",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
};

const ServiceHistory = ({ barberId }: ServiceHistoryProps) => {
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<"month" | "period">("month");

  useEffect(() => {
    if (barberId) fetchHistory();
  }, [barberId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, appointment_date, start_time, end_time, status,
        client_name, client_phone,
        client:profiles!appointments_client_id_fkey(full_name, phone),
        service:services(name, price)
      `)
      .eq("barber_id", barberId)
      .in("status", ["completed", "cancelled", "no_show"])
      .lte("appointment_date", today)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setAppointments(data || []);
    }
    setIsLoading(false);
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    appointments.forEach((apt) => {
      months.add(apt.appointment_date.substring(0, 7));
    });
    months.add(format(new Date(), "yyyy-MM"));
    return Array.from(months).sort().reverse();
  }, [appointments]);

  const processed = useMemo(() => {
    let filtered = [...appointments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((apt) => {
        const name = apt.client?.full_name || apt.client_name || "";
        const service = apt.service?.name || "";
        return name.toLowerCase().includes(term) || service.toLowerCase().includes(term);
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    if (filterMode === "month" && selectedMonth !== "all") {
      filtered = filtered.filter((apt) => apt.appointment_date.startsWith(selectedMonth));
    }

    if (filterMode === "period") {
      if (dateFrom) filtered = filtered.filter((apt) => apt.appointment_date >= format(dateFrom, "yyyy-MM-dd"));
      if (dateTo) filtered = filtered.filter((apt) => apt.appointment_date <= format(dateTo, "yyyy-MM-dd"));
    }

    return filtered;
  }, [appointments, searchTerm, statusFilter, selectedMonth, filterMode, dateFrom, dateTo]);

  const totalRevenue = useMemo(() => {
    return processed
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.service?.price || 0), 0);
  }, [processed]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return format(new Date(Number(year), Number(month) - 1, 1), "MMMM yyyy", { locale: ptBR });
  };

  const getClientName = (apt: HistoryAppointment) => apt.client?.full_name || apt.client_name || "Cliente";
  const getClientPhone = (apt: HistoryAppointment) => apt.client?.phone || apt.client_phone;

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryAppointment[]>();
    processed.forEach((apt) => {
      const key = apt.appointment_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    });
    return Array.from(map.entries());
  }, [processed]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Serviços
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
      <CardHeader className="pb-2 md:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <History className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Histórico de Serviços
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="text-[10px] md:text-xs">
              {processed.length} {processed.length === 1 ? "serviço" : "serviços"}
            </Badge>
            {totalRevenue > 0 && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] md:text-xs">
                R$ {totalRevenue.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
                <SelectItem value="no_show">Não compareceu</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMode} onValueChange={(v) => {
              setFilterMode(v as "month" | "period");
              if (v === "month") { setDateFrom(undefined); setDateTo(undefined); }
              if (v === "period") { setSelectedMonth("all"); }
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por mês</SelectItem>
                <SelectItem value="period">Por período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode === "month" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Selecionar mês" />
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
          )}

          {filterMode === "period" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarRange className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-sm hidden sm:block">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarRange className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} disabled={(date) => dateFrom ? date < dateFrom : false} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="icon" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {grouped.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum serviço encontrado</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, apts]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {format(new Date(date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <div className="space-y-2">
                  {apts.map((apt) => {
                    const phone = getClientPhone(apt);
                    return (
                      <div key={apt.id} className="flex items-center gap-2.5 md:gap-3 rounded-xl bg-secondary/50 p-2.5 md:p-3">
                        <div className="flex flex-col items-center rounded-lg bg-primary/10 px-2 py-1 md:px-2.5 md:py-1.5 min-w-[48px] md:min-w-[52px]">
                          <span className="text-xs md:text-sm font-bold text-primary">{apt.start_time.slice(0, 5)}</span>
                          <span className="text-[10px] text-muted-foreground">{apt.end_time.slice(0, 5)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{getClientName(apt)}</p>
                            {phone && (
                              <a
                                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-400 shrink-0"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.service?.name || "Serviço"} • {apt.service?.price ? `R$ ${apt.service.price.toFixed(2)}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_COLORS[apt.status] || "")}>
                          {STATUS_LABELS[apt.status] || apt.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceHistory;
