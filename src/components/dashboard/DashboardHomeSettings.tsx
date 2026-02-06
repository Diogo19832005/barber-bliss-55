import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Scissors, 
  TrendingUp, 
  Link as LinkIcon,
  BarChart3 
} from "lucide-react";

interface DashboardHomeSettingsProps {
  widgets: string[];
  onChange: (widgets: string[]) => void;
}

const availableWidgets = [
  { 
    id: "today_appointments", 
    label: "Agenda de Hoje", 
    description: "Mostra os agendamentos do dia atual",
    icon: Calendar 
  },
  { 
    id: "upcoming_appointments", 
    label: "Próximos Agendamentos", 
    description: "Lista os próximos agendamentos futuros",
    icon: Clock 
  },
  { 
    id: "services", 
    label: "Meus Serviços", 
    description: "Exibe seus serviços cadastrados",
    icon: Scissors 
  },
  { 
    id: "earnings", 
    label: "Resumo Financeiro", 
    description: "Cards com ganhos diário, semanal e mensal",
    icon: DollarSign 
  },
  { 
    id: "analytics", 
    label: "Gráficos de Desempenho", 
    description: "Gráficos detalhados de faturamento",
    icon: BarChart3 
  },
  { 
    id: "public_link", 
    label: "Link Público", 
    description: "Card com seu link de agendamento",
    icon: LinkIcon 
  },
];

const DashboardHomeSettings = ({ widgets, onChange }: DashboardHomeSettingsProps) => {
  const toggleWidget = (widgetId: string) => {
    if (widgets.includes(widgetId)) {
      onChange(widgets.filter((w) => w !== widgetId));
    } else {
      onChange([...widgets, widgetId]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Página Inicial do Dashboard</Label>
        <p className="text-sm text-muted-foreground">
          Escolha quais seções aparecem na sua página inicial
        </p>
      </div>

      <div className="space-y-3">
        {availableWidgets.map((widget) => {
          const Icon = widget.icon;
          const isChecked = widgets.includes(widget.id);

          return (
            <label
              key={widget.id}
              className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                isChecked 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggleWidget(widget.id)}
                className="mt-0.5"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isChecked ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{widget.label}</p>
                  <p className="text-sm text-muted-foreground">{widget.description}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardHomeSettings;
