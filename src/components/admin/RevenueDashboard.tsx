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
  DollarSign,
  TrendingUp,
  CalendarIcon,
  BarChart3,
  Users,
  Loader2,
  CreditCard,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DateRange } from "react-day-picker";

interface Subscription {
  id: string;
  barber_id: string;
  plan_type: string;
  payment_status: string;
  monthly_price: number | null;
  quarterly_price: number | null;
  semiannual_price: number | null;
  yearly_price: number | null;
  last_payment_date: string | null;
  subscription_start_date: string | null;
  created_at: string;
  barber_name?: string;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Trial",
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
  paused: "Pausado",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const RevenueDashboard = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"month" | "dateRange">("month");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const months = [
    { value: "all", label: "Todos os meses" },
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const { data: subs } = await supabase
      .from("barber_subscriptions")
      .select("*");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "barber");

    const nameMap = new Map<string, string>();
    profiles?.forEach((p) => nameMap.set(p.id, p.full_name));

    setSubscriptions(
      (subs || []).map((s) => ({
        ...s,
        barber_name: nameMap.get(s.barber_id) || "Desconhecido",
      }))
    );
    setIsLoading(false);
  };

  const availableYears = useMemo(() => {
    const years = new Set(
      subscriptions
        .filter((s) => s.last_payment_date)
        .map((s) => new Date(s.last_payment_date!).getFullYear())
    );
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [subscriptions]);

  // Filter subscriptions that are paid
  const paidSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.payment_status === "paid" || s.last_payment_date),
    [subscriptions]
  );

  const filteredPaid = useMemo(() => {
    if (filterMode === "dateRange") {
      if (!dateRange?.from || !dateRange?.to) return paidSubscriptions;
      return paidSubscriptions.filter((s) => {
        if (!s.last_payment_date) return false;
        const d = new Date(s.last_payment_date);
        return d >= dateRange.from! && d <= new Date(dateRange.to!.getFullYear(), dateRange.to!.getMonth(), dateRange.to!.getDate(), 23, 59, 59);
      });
    }
    if (filterMonth === "all") return paidSubscriptions;
    return paidSubscriptions.filter((s) => {
      if (!s.last_payment_date) return false;
      const d = new Date(s.last_payment_date);
      return d.getMonth() === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear);
    });
  }, [paidSubscriptions, filterMonth, filterYear, filterMode, dateRange]);

  // Calculate revenue based on plan type
  const getRevenue = (s: Subscription): number => {
    switch (s.plan_type) {
      case "monthly": return s.monthly_price || 49.9;
      case "quarterly": return s.quarterly_price || 134.9;
      case "semiannual": return s.semiannual_price || 254.9;
      case "yearly": return s.yearly_price || 499.9;
      default: return s.monthly_price || 0;
    }
  };

  // Revenue stats
  const stats = useMemo(() => {
    const totalRevenue = filteredPaid.reduce((sum, s) => sum + getRevenue(s), 0);
    const byPlan: Record<string, { count: number; revenue: number }> = {};
    filteredPaid.forEach((s) => {
      if (!byPlan[s.plan_type]) byPlan[s.plan_type] = { count: 0, revenue: 0 };
      byPlan[s.plan_type].count++;
      byPlan[s.plan_type].revenue += getRevenue(s);
    });

    const statusCounts: Record<string, number> = {};
    subscriptions.forEach((s) => {
      statusCounts[s.payment_status] = (statusCounts[s.payment_status] || 0) + 1;
    });

    return { totalRevenue, byPlan, statusCounts };
  }, [filteredPaid, subscriptions]);

  // Monthly revenue chart data (last 12 months)
  const monthlyChartData = useMemo(() => {
    const data: { month: string; revenue: number; count: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = format(date, "MMM/yy", { locale: ptBR });
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthSubs = paidSubscriptions.filter((s) => {
        if (!s.last_payment_date) return false;
        const d = new Date(s.last_payment_date);
        return d.getMonth() === month && d.getFullYear() === year;
      });

      data.push({
        month: monthStr,
        revenue: monthSubs.reduce((sum, s) => sum + getRevenue(s), 0),
        count: monthSubs.length,
      });
    }

    return data;
  }, [paidSubscriptions]);

  // Pie chart data by plan type
  const planPieData = useMemo(() => {
    return Object.entries(stats.byPlan).map(([plan, data]) => ({
      name: PLAN_LABELS[plan] || plan,
      value: data.revenue,
      count: data.count,
    }));
  }, [stats.byPlan]);

  // Pie chart data by status
  const statusPieData = useMemo(() => {
    return Object.entries(stats.statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
    }));
  }, [stats.statusCounts]);

  // Estimated MRR (monthly recurring revenue)
  const estimatedMRR = useMemo(() => {
    return subscriptions
      .filter((s) => s.payment_status === "paid")
      .reduce((sum, s) => {
        switch (s.plan_type) {
          case "monthly": return sum + (s.monthly_price || 49.9);
          case "quarterly": return sum + (s.quarterly_price || 134.9) / 3;
          case "semiannual": return sum + (s.semiannual_price || 254.9) / 6;
          case "yearly": return sum + (s.yearly_price || 499.9) / 12;
          default: return sum;
        }
      }, 0);
  }, [subscriptions]);

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
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Dashboard Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <DollarSign className="mx-auto h-6 w-6 text-success mb-1" />
              <p className="text-2xl font-bold text-success">
                R$ {estimatedMRR.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">MRR Estimado</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <Users className="mx-auto h-6 w-6 text-primary mb-1" />
              <p className="text-2xl font-bold">
                {subscriptions.filter((s) => s.payment_status === "paid").length}
              </p>
              <p className="text-xs text-muted-foreground">Assinantes Ativos</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <CreditCard className="mx-auto h-6 w-6 text-warning mb-1" />
              <p className="text-2xl font-bold text-warning">
                {subscriptions.filter((s) => s.payment_status === "trial").length}
              </p>
              <p className="text-xs text-muted-foreground">Em Trial</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <BarChart3 className="mx-auto h-6 w-6 text-destructive mb-1" />
              <p className="text-2xl font-bold text-destructive">
                {subscriptions.filter((s) => ["pending", "overdue"].includes(s.payment_status)).length}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes/Vencidos</p>
            </div>
          </div>

          {/* Status distribution */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className="gap-1">
                {STATUS_LABELS[status]}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by period */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Receita por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant={filterMode === "month" ? "default" : "outline"}
              onClick={() => setFilterMode("month")}
            >
              Por Mês
            </Button>
            <Button
              size="sm"
              variant={filterMode === "dateRange" ? "default" : "outline"}
              onClick={() => setFilterMode("dateRange")}
            >
              Por Datas
            </Button>
          </div>

          {filterMode === "month" ? (
            <div className="flex flex-wrap gap-3">
              <div className="w-48">
                <Label className="text-xs text-muted-foreground">Mês</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filterMonth !== "all" && (
                <div className="w-32">
                  <Label className="text-xs text-muted-foreground">Ano</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal bg-secondary/50",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDateRange(undefined)}
                  className="text-muted-foreground"
                >
                  Limpar
                </Button>
              )}
            </div>
          )}

          {/* Revenue result */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
              <p className="text-3xl font-bold text-success">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Receita no período ({filteredPaid.length} pagamentos)
              </p>
            </div>
            {Object.entries(stats.byPlan).map(([plan, data]) => (
              <div key={plan} className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xl font-bold">R$ {data.revenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  {PLAN_LABELS[plan]} ({data.count} {data.count === 1 ? "assinante" : "assinantes"})
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Receita Mensal (Últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Plan & Status distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {planPieData.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Receita por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {planPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {statusPieData.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RevenueDashboard;
