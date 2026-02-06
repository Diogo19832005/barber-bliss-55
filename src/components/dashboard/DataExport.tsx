import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DataExportProps {
  barberId: string;
}

const exportPeriods = [
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "1 mês", months: 1 },
  { label: "2 meses", months: 2 },
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "12 meses", months: 12 },
  { label: "13 meses", months: 13 },
];

const DataExport = ({ barberId }: DataExportProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDateRange = (period: typeof exportPeriods[0]) => {
    const endDate = new Date();
    let startDate: Date;

    if (period.days) {
      startDate = subDays(endDate, period.days);
    } else if (period.months) {
      startDate = subMonths(endDate, period.months);
    } else {
      startDate = subDays(endDate, 7);
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };

  const exportData = async (period: typeof exportPeriods[0] | null, customRange?: { startDate: string; endDate: string }) => {
    const exportLabel = period?.label || "Personalizado";
    setIsExporting(exportLabel);

    try {
      const { startDate, endDate } = customRange || getDateRange(period!);

      // Fetch appointments with related data
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          created_at,
          client:profiles!appointments_client_id_fkey(full_name, phone),
          service:services(name, price, duration_minutes)
        `)
        .eq("barber_id", barberId)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        toast({
          title: "Sem dados",
          description: `Nenhum agendamento encontrado no período selecionado.`,
          variant: "destructive",
        });
        setIsExporting(null);
        return;
      }

      // Calculate summary
      const completed = appointments.filter((a) => a.status === "completed");
      const totalEarnings = completed.reduce(
        (sum, a) => sum + ((a.service as any)?.price || 0),
        0
      );
      const totalAppointments = appointments.length;
      const completedCount = completed.length;
      const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

      // Create CSV content
      const csvRows = [
        // Header with summary
        [`Relatório de Agendamentos - ${exportLabel}`],
        [`Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`],
        [`Total de Agendamentos: ${totalAppointments}`],
        [`Concluídos: ${completedCount}`],
        [`Cancelados: ${cancelledCount}`],
        [`Faturamento Total: R$ ${totalEarnings.toFixed(2)}`],
        [],
        // Data header
        ["Data", "Horário", "Cliente", "Telefone", "Serviço", "Duração (min)", "Valor (R$)", "Status", "Observações"],
        // Data rows
        ...appointments.map((apt) => [
          format(new Date(apt.appointment_date), "dd/MM/yyyy"),
          `${apt.start_time.slice(0, 5)} - ${apt.end_time.slice(0, 5)}`,
          (apt.client as any)?.full_name || "N/A",
          (apt.client as any)?.phone || "N/A",
          (apt.service as any)?.name || "N/A",
          (apt.service as any)?.duration_minutes || "N/A",
          (apt.service as any)?.price?.toFixed(2) || "0.00",
          apt.status === "completed" ? "Concluído" : apt.status === "cancelled" ? "Cancelado" : "Agendado",
          apt.notes || "",
        ]),
      ];

      // Convert to CSV string
      const csvContent = csvRows
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              // Escape quotes and wrap in quotes if contains comma or quote
              if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",")
        )
        .join("\n");

      // Add BOM for Excel compatibility with UTF-8
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      const fileLabel = period ? period.label.replace(" ", "_") : `${format(new Date(startDate), "dd-MM-yyyy")}_a_${format(new Date(endDate), "dd-MM-yyyy")}`;
      link.download = `agendamentos_${fileLabel}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída!",
        description: `${appointments.length} registros exportados com sucesso.`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Erro na exportação",
        description: error.message || "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Exportar Dados
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Baixe seus dados de agendamentos em formato CSV (compatível com Excel)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom Date Range Picker */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <p className="text-sm font-medium mb-2">Período Personalizado</p>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
                  disabled={(date) =>
                    date > new Date() || date < subMonths(new Date(), 13)
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            onClick={() => {
              if (dateRange?.from && dateRange?.to) {
                exportData(null, {
                  startDate: format(dateRange.from, "yyyy-MM-dd"),
                  endDate: format(dateRange.to, "yyyy-MM-dd"),
                });
                setIsCalendarOpen(false);
              } else {
                toast({
                  title: "Selecione um período",
                  description: "Por favor, selecione a data inicial e final.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isExporting !== null || !dateRange?.from || !dateRange?.to}
            className="w-full sm:w-auto"
          >
            {isExporting === "Personalizado" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou escolha um período</span>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {exportPeriods.map((period) => (
            <Button
              key={period.label}
              variant="outline"
              className="h-auto flex-col gap-1 py-3"
              onClick={() => exportData(period)}
              disabled={isExporting !== null}
            >
              {isExporting === period.label ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">{period.label}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Os dados são armazenados por até 13 meses para histórico e análises
        </p>
      </CardContent>
    </Card>
  );
};

export default DataExport;
