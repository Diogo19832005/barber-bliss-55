import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

  const exportData = async (period: typeof exportPeriods[0]) => {
    setIsExporting(period.label);

    try {
      const { startDate, endDate } = getDateRange(period);

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
          description: `Nenhum agendamento encontrado nos últimos ${period.label}.`,
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
        [`Relatório de Agendamentos - Últimos ${period.label}`],
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
      link.download = `agendamentos_${period.label.replace(" ", "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
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
      <CardContent>
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
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Os dados são armazenados por até 13 meses para histórico e análises
        </p>
      </CardContent>
    </Card>
  );
};

export default DataExport;
