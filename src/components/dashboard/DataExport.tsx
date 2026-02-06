import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DataExportProps {
  barberId: string;
}

const DataExport = ({ barberId }: DataExportProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const exportData = async (customRange: { startDate: string; endDate: string }) => {
    setIsExporting(true);

    try {
      const { startDate, endDate } = customRange;

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
          client_name,
          client_phone,
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
        setIsExporting(false);
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

      // Create CSV content with semicolon separator for Brazilian Excel
      const sep = ";";
      const csvRows = [
        // Summary header row
        ["Relatório de Agendamentos", "", "", "", "", "", "", "", ""],
        ["Período", `${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`, "", "", "", "", "", "", ""],
        ["Total de Agendamentos", String(totalAppointments), "", "Concluídos", String(completedCount), "", "Cancelados", String(cancelledCount), ""],
        ["Faturamento Total", `R$ ${totalEarnings.toFixed(2)}`, "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        // Data header
        ["Data", "Horário Início", "Horário Fim", "Cliente", "Telefone", "Serviço", "Duração (min)", "Valor (R$)", "Status", "Observações"],
        // Data rows
        ...appointments.map((apt) => [
          format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM/yyyy"),
          apt.start_time.slice(0, 5),
          apt.end_time.slice(0, 5),
          (apt.client as any)?.full_name || apt.client_name || "Cliente avulso",
          (apt.client as any)?.phone || apt.client_phone || "",
          (apt.service as any)?.name || "",
          String((apt.service as any)?.duration_minutes || ""),
          ((apt.service as any)?.price?.toFixed(2) || "0.00").replace(".", ","),
          apt.status === "completed" ? "Concluído" : apt.status === "cancelled" ? "Cancelado" : "Agendado",
          apt.notes || "",
        ]),
      ];

      // Convert to CSV string with semicolon separator
      const csvContent = csvRows
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              if (cellStr.includes(sep) || cellStr.includes('"') || cellStr.includes("\n")) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(sep)
        )
        .join("\n");

      // Add BOM for Excel compatibility with UTF-8
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      const fileLabel = `${format(new Date(startDate), "dd-MM-yyyy")}_a_${format(new Date(endDate), "dd-MM-yyyy")}`;
      link.download = `agendamentos_${fileLabel}.csv`;
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
      setIsExporting(false);
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
      <CardContent>
        {/* Custom Date Range Picker */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <p className="text-sm font-medium mb-2">Selecione o Período</p>
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
                exportData({
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
            disabled={isExporting || !dateRange?.from || !dateRange?.to}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Os dados são armazenados por até 13 meses para histórico e análises
        </p>
      </CardContent>
    </Card>
  );
};

export default DataExport;
