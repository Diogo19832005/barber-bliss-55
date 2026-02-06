import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, CalendarDays, Users } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface EarningsChartProps {
  barberId: string;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  earnings: number;
  appointments: number;
}

interface DailyData {
  day: string;
  dayLabel: string;
  earnings: number;
  appointments: number;
}

const EarningsChart = ({ barberId }: EarningsChartProps) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [growth, setGrowth] = useState<number | null>(null);

  useEffect(() => {
    if (barberId) {
      fetchAnalytics();
    }
  }, [barberId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    
    const today = new Date();
    
    // Get last 6 months
    const months = eachMonthOfInterval({
      start: subMonths(today, 5),
      end: today
    });

    // Get last 30 days
    const days = eachDayOfInterval({
      start: subDays(today, 29),
      end: today
    });

    // Fetch monthly data
    const monthlyPromises = months.map(async (month) => {
      const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

      const { data } = await supabase
        .from("appointments")
        .select("id, service:services(price)")
        .eq("barber_id", barberId)
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .eq("status", "completed");

      const earnings = data?.reduce((sum, item: any) => sum + (item.service?.price || 0), 0) || 0;
      
      return {
        month: format(month, "yyyy-MM"),
        monthLabel: format(month, "MMM", { locale: ptBR }),
        earnings,
        appointments: data?.length || 0,
      };
    });

    // Fetch daily data for last 30 days
    const dailyPromises = days.map(async (day) => {
      const dayStr = format(day, "yyyy-MM-dd");

      const { data } = await supabase
        .from("appointments")
        .select("id, service:services(price)")
        .eq("barber_id", barberId)
        .eq("appointment_date", dayStr)
        .eq("status", "completed");

      const earnings = data?.reduce((sum, item: any) => sum + (item.service?.price || 0), 0) || 0;

      return {
        day: dayStr,
        dayLabel: format(day, "dd/MM"),
        earnings,
        appointments: data?.length || 0,
      };
    });

    // Fetch unique clients count
    const { data: clientsData } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("barber_id", barberId)
      .eq("status", "completed");

    const uniqueClients = new Set(clientsData?.map(c => c.client_id));
    setTotalClients(uniqueClients.size);

    const monthlyResults = await Promise.all(monthlyPromises);
    const dailyResults = await Promise.all(dailyPromises);

    setMonthlyData(monthlyResults);
    setDailyData(dailyResults);

    // Calculate growth (compare this month to last month)
    if (monthlyResults.length >= 2) {
      const currentMonth = monthlyResults[monthlyResults.length - 1].earnings;
      const lastMonth = monthlyResults[monthlyResults.length - 2].earnings;
      
      if (lastMonth > 0) {
        const growthPercent = ((currentMonth - lastMonth) / lastMonth) * 100;
        setGrowth(Math.round(growthPercent));
      } else if (currentMonth > 0) {
        setGrowth(100);
      } else {
        setGrowth(0);
      }
    }

    setIsLoading(false);
  };

  const totalEarnings6Months = monthlyData.reduce((sum, m) => sum + m.earnings, 0);
  const totalAppointments6Months = monthlyData.reduce((sum, m) => sum + m.appointments, 0);
  const avgMonthlyEarnings = totalEarnings6Months / (monthlyData.length || 1);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Análise de Desempenho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Últimos 6 meses</p>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="mt-2 text-xl font-bold">
              R$ {totalEarnings6Months.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Média Mensal</p>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-bold">
              R$ {avgMonthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Atendimentos</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xl font-bold">{totalAppointments6Months}</p>
            <p className="text-xs text-muted-foreground">{totalClients} clientes únicos</p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Crescimento</p>
              {growth !== null && growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className={`mt-2 text-xl font-bold ${
              growth !== null && growth >= 0 ? "text-success" : "text-destructive"
            }`}>
              {growth !== null ? (growth >= 0 ? `+${growth}%` : `${growth}%`) : "-"}
            </p>
            <p className="text-xs text-muted-foreground">vs mês anterior</p>
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="monthly">Por Mês</TabsTrigger>
            <TabsTrigger value="daily">Últimos 30 dias</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="monthLabel" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                  />
                  <Bar 
                    dataKey="earnings" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Appointments Chart */}
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Atendimentos por mês</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="monthLabel" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Atendimentos']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="dayLabel" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorEarnings)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Appointments */}
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Atendimentos diários</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="dayLabel" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Atendimentos']}
                    />
                    <Bar 
                      dataKey="appointments" 
                      fill="hsl(var(--success))" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EarningsChart;
