import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  CalendarIcon,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  created_at: string;
  admin_email?: string;
}

interface AdminSummary {
  user_id: string;
  email: string;
  total: number;
  actions: Record<string, number>;
}

const ACTION_LABELS: Record<string, string> = {
  approve_barber: "Aprovar barbeiro",
  reject_barber: "Recusar barbeiro",
  suspend_barber: "Suspender barbeiro",
  toggle_barbershop_admin: "Alterar admin de barbearia",
  add_admin: "Adicionar administrador",
  remove_admin: "Remover administrador",
  change_admin_role: "Alterar cargo de admin",
  update_permissions: "Atualizar permissões",
  mark_as_paid: "Marcar como pago",
  update_subscription: "Atualizar assinatura",
  create_subscription: "Criar assinatura",
  toggle_pause: "Pausar/Reativar conta",
};

const ACTION_COLORS: Record<string, string> = {
  approve_barber: "border-success text-success",
  reject_barber: "border-destructive text-destructive",
  suspend_barber: "border-destructive text-destructive",
  add_admin: "border-primary text-primary",
  remove_admin: "border-destructive text-destructive",
  mark_as_paid: "border-success text-success",
  toggle_pause: "border-warning text-warning",
};

const AdminActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAdmin, setFilterAdmin] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showSummary, setShowSummary] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching activity logs:", error);
      setIsLoading(false);
      return;
    }

    // Get admin emails
    const adminIds = [...new Set((data || []).map((l: any) => l.admin_user_id))];
    const emailMap = new Map<string, string>();

    for (const uid of adminIds) {
      const { data: email } = await supabase.rpc("get_user_email_by_id" as any, {
        target_user_id: uid,
      });
      if (email) emailMap.set(uid, email as string);
    }

    setLogs(
      (data || []).map((l: any) => ({
        ...l,
        admin_email: emailMap.get(l.admin_user_id) || "Desconhecido",
      }))
    );
    setIsLoading(false);
  };

  const adminOptions = useMemo(() => {
    const admins = new Map<string, string>();
    logs.forEach((l) => admins.set(l.admin_user_id, l.admin_email || "Desconhecido"));
    return Array.from(admins.entries()).map(([id, email]) => ({ id, email }));
  }, [logs]);

  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return Array.from(actions);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filterAdmin !== "all") result = result.filter((l) => l.admin_user_id === filterAdmin);
    if (filterAction !== "all") result = result.filter((l) => l.action === filterAction);
    if (dateRange?.from) {
      result = result.filter((l) => {
        const d = new Date(l.created_at);
        if (!dateRange.from) return true;
        if (dateRange.to) {
          return d >= dateRange.from && d <= new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59);
        }
        return d >= dateRange.from;
      });
    }
    return result;
  }, [logs, filterAdmin, filterAction, dateRange]);

  const adminSummaries = useMemo((): AdminSummary[] => {
    const map = new Map<string, AdminSummary>();
    filteredLogs.forEach((l) => {
      if (!map.has(l.admin_user_id)) {
        map.set(l.admin_user_id, {
          user_id: l.admin_user_id,
          email: l.admin_email || "Desconhecido",
          total: 0,
          actions: {},
        });
      }
      const summary = map.get(l.admin_user_id)!;
      summary.total++;
      summary.actions[l.action] = (summary.actions[l.action] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary per admin */}
      <Card className="glass-card">
        <CardHeader className="cursor-pointer" onClick={() => setShowSummary(!showSummary)}>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Ações por Administrador
            </span>
            {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showSummary && (
          <CardContent className="space-y-3">
            {adminSummaries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma ação registrada</p>
            ) : (
              adminSummaries.map((admin) => (
                <div key={admin.user_id} className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{admin.email}</p>
                    <Badge variant="outline">{admin.total} ações</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(admin.actions).map(([action, count]) => (
                      <Badge
                        key={action}
                        variant="outline"
                        className={cn("text-xs", ACTION_COLORS[action] || "")}
                      >
                        {ACTION_LABELS[action] || action}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Activity Timeline */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Ações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="w-56">
              <Label className="text-xs text-muted-foreground">Administrador</Label>
              <Select value={filterAdmin} onValueChange={setFilterAdmin}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {adminOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Tipo de Ação</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal bg-secondary/50",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                      )
                    ) : (
                      "Filtrar por datas"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {dateRange?.from && (
              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={() => setDateRange(undefined)}>
                  Limpar
                </Button>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{filteredLogs.length} ações encontradas</p>

          {/* Timeline */}
          <div className="space-y-2">
            {filteredLogs.slice(0, visibleCount).map((log) => (
              <div
                key={log.id}
                className="flex gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", ACTION_COLORS[log.action] || "")}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                    {log.target_name && (
                      <span className="font-medium">{log.target_name}</span>
                    )}
                  </div>
                  {log.details && (
                    <p className="mt-1 text-muted-foreground text-xs">{log.details}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    por <span className="font-medium">{log.admin_email}</span>
                    {" • "}
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length > visibleCount && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setVisibleCount((prev) => prev + 50)}
            >
              Carregar mais ({filteredLogs.length - visibleCount} restantes)
            </Button>
          )}

          {filteredLogs.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma ação registrada ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivityLog;
