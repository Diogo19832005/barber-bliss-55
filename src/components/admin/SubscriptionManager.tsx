import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Subscription {
  id: string;
  barber_id: string;
  plan_type: "monthly" | "quarterly" | "semiannual" | "yearly";
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date: string | null;
  next_payment_date: string | null;
  payment_status: "trial" | "paid" | "pending" | "overdue";
  monthly_price: number;
  quarterly_price?: number;
  semiannual_price?: number;
  yearly_price: number;
  last_payment_date: string | null;
  barber?: {
    full_name: string;
    phone: string | null;
  };
}

interface BarberWithSubscription {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  subscription: Subscription | null;
}

const SubscriptionManager = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<BarberWithSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<BarberWithSubscription | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editPlanType, setEditPlanType] = useState<"monthly" | "quarterly" | "semiannual" | "yearly">("monthly");
  const [editMonthlyPrice, setEditMonthlyPrice] = useState("49.90");
  const [editQuarterlyPrice, setEditQuarterlyPrice] = useState("134.90");
  const [editSemiannualPrice, setEditSemiannualPrice] = useState("254.90");
  const [editYearlyPrice, setEditYearlyPrice] = useState("499.90");
  const [editPaymentStatus, setEditPaymentStatus] = useState<"trial" | "paid" | "pending" | "overdue">("trial");

  // Auto-calculate prices based on monthly price with progressive discounts
  const calculatePricesFromMonthly = (monthlyValue: string) => {
    const monthly = parseFloat(monthlyValue) || 0;
    // Quarterly: 3 months with ~9% discount
    const quarterly = (monthly * 3 * 0.91).toFixed(2);
    // Semiannual: 6 months with ~15% discount
    const semiannual = (monthly * 6 * 0.85).toFixed(2);
    // Yearly: 12 months with ~17% discount
    const yearly = (monthly * 12 * 0.83).toFixed(2);
    
    setEditQuarterlyPrice(quarterly);
    setEditSemiannualPrice(semiannual);
    setEditYearlyPrice(yearly);
  };

  const handleMonthlyPriceChange = (value: string) => {
    setEditMonthlyPrice(value);
    calculatePricesFromMonthly(value);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setIsLoading(true);

    // Fetch all approved barbers with their subscriptions
    const { data: barbers, error: barbersError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .eq("role", "barber")
      .eq("barber_status", "approved")
      .order("full_name");

    if (barbersError) {
      console.error("Error fetching barbers:", barbersError);
      setIsLoading(false);
      return;
    }

    // Fetch subscriptions
    const { data: subs, error: subsError } = await supabase
      .from("barber_subscriptions")
      .select("*");

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
    }

    // Combine barbers with subscriptions
    const combined: BarberWithSubscription[] = (barbers || []).map((barber) => ({
      ...barber,
      subscription: (subs || []).find((s) => s.barber_id === barber.id) || null,
    }));

    setSubscriptions(combined);
    setIsLoading(false);
  };

  const createSubscription = async (barberId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { error } = await supabase.from("barber_subscriptions").insert({
      barber_id: barberId,
      trial_start_date: today,
      trial_end_date: trialEnd.toISOString().split("T")[0],
      payment_status: "trial",
    });

    if (error) {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Assinatura criada com sucesso!" });
      fetchSubscriptions();
    }
  };

  const openEditModal = (barber: BarberWithSubscription) => {
    setSelectedBarber(barber);
    if (barber.subscription) {
      setEditPlanType(barber.subscription.plan_type);
      setEditMonthlyPrice(barber.subscription.monthly_price?.toString() || "49.90");
      setEditQuarterlyPrice(barber.subscription.quarterly_price?.toString() || "134.90");
      setEditSemiannualPrice(barber.subscription.semiannual_price?.toString() || "254.90");
      setEditYearlyPrice(barber.subscription.yearly_price?.toString() || "499.90");
      setEditPaymentStatus(barber.subscription.payment_status);
    } else {
      setEditPlanType("monthly");
      setEditMonthlyPrice("49.90");
      setEditQuarterlyPrice("134.90");
      setEditSemiannualPrice("254.90");
      setEditYearlyPrice("499.90");
      setEditPaymentStatus("trial");
    }
    setIsEditOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedBarber) return;

    setIsSaving(true);

    const today = new Date().toISOString().split("T")[0];
    
    // Calculate next payment date based on plan type
    let nextPaymentDate: string | null = null;
    if (editPaymentStatus === "paid") {
      const nextDate = new Date();
      if (editPlanType === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (editPlanType === "quarterly") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (editPlanType === "semiannual") {
        nextDate.setMonth(nextDate.getMonth() + 6);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      nextPaymentDate = nextDate.toISOString().split("T")[0];
    }

    if (selectedBarber.subscription) {
      // Update existing subscription
      const { error } = await supabase
        .from("barber_subscriptions")
        .update({
          plan_type: editPlanType,
          monthly_price: parseFloat(editMonthlyPrice),
          quarterly_price: parseFloat(editQuarterlyPrice),
          semiannual_price: parseFloat(editSemiannualPrice),
          yearly_price: parseFloat(editYearlyPrice),
          payment_status: editPaymentStatus,
          subscription_start_date: editPaymentStatus !== "trial" ? today : null,
          next_payment_date: nextPaymentDate,
          last_payment_date: editPaymentStatus === "paid" ? today : selectedBarber.subscription.last_payment_date,
        })
        .eq("id", selectedBarber.subscription.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Assinatura atualizada!" });
        setIsEditOpen(false);
        fetchSubscriptions();
      }
    } else {
      // Create new subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const { error } = await supabase.from("barber_subscriptions").insert({
        barber_id: selectedBarber.id,
        plan_type: editPlanType,
        trial_start_date: today,
        trial_end_date: trialEnd.toISOString().split("T")[0],
        monthly_price: parseFloat(editMonthlyPrice),
        quarterly_price: parseFloat(editQuarterlyPrice),
        semiannual_price: parseFloat(editSemiannualPrice),
        yearly_price: parseFloat(editYearlyPrice),
        payment_status: editPaymentStatus,
        subscription_start_date: editPaymentStatus !== "trial" ? today : null,
        next_payment_date: nextPaymentDate,
        last_payment_date: editPaymentStatus === "paid" ? today : null,
      });

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Assinatura criada!" });
        setIsEditOpen(false);
        fetchSubscriptions();
      }
    }

    setIsSaving(false);
  };

  const markAsPaid = async (subscription: Subscription) => {
    const today = new Date();
    const nextDate = new Date();
    
    if (subscription.plan_type === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (subscription.plan_type === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (subscription.plan_type === "semiannual") {
      nextDate.setMonth(nextDate.getMonth() + 6);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    const { error } = await supabase
      .from("barber_subscriptions")
      .update({
        payment_status: "paid",
        last_payment_date: today.toISOString().split("T")[0],
        next_payment_date: nextDate.toISOString().split("T")[0],
        subscription_start_date: subscription.subscription_start_date || today.toISOString().split("T")[0],
      })
      .eq("id", subscription.id);

    if (error) {
      toast({
        title: "Erro ao marcar como pago",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Pagamento registrado!" });
      fetchSubscriptions();
    }
  };

  const getStatusBadge = (status: string, trialEndDate?: string) => {
    const today = new Date();
    const trialEnd = trialEndDate ? new Date(trialEndDate) : null;
    const isTrialExpired = trialEnd && today > trialEnd;

    if (status === "trial" && isTrialExpired) {
      return (
        <Badge variant="outline" className="border-destructive text-destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Trial Expirado
        </Badge>
      );
    }

    switch (status) {
      case "trial":
        return (
          <Badge variant="outline" className="border-primary text-primary">
            <Clock className="mr-1 h-3 w-3" />
            Trial
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pago
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Vencido
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const checkAndUpdateStatuses = async () => {
    const today = new Date();

    for (const barber of subscriptions) {
      if (!barber.subscription) continue;

      const sub = barber.subscription;
      const trialEnd = new Date(sub.trial_end_date);
      const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;

      // Check if trial expired
      if (sub.payment_status === "trial" && today > trialEnd) {
        await supabase
          .from("barber_subscriptions")
          .update({ payment_status: "pending" })
          .eq("id", sub.id);
      }

      // Check if payment is overdue
      if (sub.payment_status === "paid" && nextPayment && today > nextPayment) {
        await supabase
          .from("barber_subscriptions")
          .update({ payment_status: "pending" })
          .eq("id", sub.id);
      }
    }

    fetchSubscriptions();
    toast({ title: "Status atualizados!" });
  };

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
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Controle de Mensalidades
          </CardTitle>
          <Button variant="outline" size="sm" onClick={checkAndUpdateStatuses}>
            Atualizar Status
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum barbeiro aprovado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial/Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((barber) => {
                    const sub = barber.subscription;
                    const trialDays = sub ? getDaysRemaining(sub.trial_end_date) : 7;
                    const nextPaymentDays = sub?.next_payment_date
                      ? getDaysRemaining(sub.next_payment_date)
                      : null;

                    return (
                      <TableRow key={barber.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{barber.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {barber.phone || "Sem telefone"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(barber.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            <Badge variant="secondary">
                              {sub.plan_type === "monthly" ? "Mensal" : 
                               sub.plan_type === "quarterly" ? "Trimestral" :
                               sub.plan_type === "semiannual" ? "Semestral" : "Anual"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            getStatusBadge(sub.payment_status, sub.trial_end_date)
                          ) : (
                            <Badge variant="outline" className="border-muted text-muted-foreground">
                              Sem assinatura
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            sub.payment_status === "trial" ? (
                              <span className={trialDays <= 0 ? "text-destructive" : trialDays <= 2 ? "text-warning" : ""}>
                                {trialDays <= 0
                                  ? "Expirado"
                                  : `${trialDays} dia${trialDays !== 1 ? "s" : ""} restantes`}
                              </span>
                            ) : sub.next_payment_date ? (
                              <span className={nextPaymentDays && nextPaymentDays <= 0 ? "text-destructive" : ""}>
                                {new Date(sub.next_payment_date).toLocaleDateString("pt-BR")}
                                {nextPaymentDays !== null && nextPaymentDays <= 0 && " (Vencido)"}
                              </span>
                            ) : (
                              "—"
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            <span className="font-medium">
                              R$ {sub.plan_type === "monthly"
                                ? Number(sub.monthly_price).toFixed(2)
                                : sub.plan_type === "quarterly"
                                ? Number(sub.quarterly_price || 134.90).toFixed(2)
                                : sub.plan_type === "semiannual"
                                ? Number(sub.semiannual_price || 254.90).toFixed(2)
                                : Number(sub.yearly_price).toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {sub && (sub.payment_status === "pending" || sub.payment_status === "overdue" || 
                              (sub.payment_status === "trial" && getDaysRemaining(sub.trial_end_date) <= 0)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-success text-success"
                                onClick={() => markAsPaid(sub)}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Pago
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(barber)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              {selectedBarber?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Plano</Label>
              <Select value={editPlanType} onValueChange={(v) => setEditPlanType(v as "monthly" | "quarterly" | "semiannual" | "yearly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">
                    <div className="flex items-center gap-2">
                      <span>Trimestral</span>
                      <Badge variant="outline" className="border-warning text-warning text-xs">Não recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="semiannual">
                    <div className="flex items-center gap-2">
                      <span>Semestral</span>
                      <Badge variant="outline" className="border-warning text-warning text-xs">Não recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valor Mensal (R$) <span className="text-xs text-muted-foreground">(base para cálculo)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editMonthlyPrice}
                  onChange={(e) => handleMonthlyPriceChange(e.target.value)}
                  className="font-medium"
                />
              </div>
              
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Valores calculados automaticamente:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Trimestral <span className="text-warning">(~9% desc.)</span></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editQuarterlyPrice}
                      onChange={(e) => setEditQuarterlyPrice(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Semestral <span className="text-warning">(~15% desc.)</span></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editSemiannualPrice}
                      onChange={(e) => setEditSemiannualPrice(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Anual <span className="text-success">(~17% desc.)</span></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editYearlyPrice}
                      onChange={(e) => setEditYearlyPrice(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status do Pagamento</Label>
              <Select value={editPaymentStatus} onValueChange={(v) => setEditPaymentStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (7 dias grátis)</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedBarber?.subscription && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p><strong>Trial:</strong> {new Date(selectedBarber.subscription.trial_start_date).toLocaleDateString("pt-BR")} - {new Date(selectedBarber.subscription.trial_end_date).toLocaleDateString("pt-BR")}</p>
                {selectedBarber.subscription.last_payment_date && (
                  <p><strong>Último pagamento:</strong> {new Date(selectedBarber.subscription.last_payment_date).toLocaleDateString("pt-BR")}</p>
                )}
                {selectedBarber.subscription.next_payment_date && (
                  <p><strong>Próximo vencimento:</strong> {new Date(selectedBarber.subscription.next_payment_date).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={handleSaveSubscription} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionManager;
