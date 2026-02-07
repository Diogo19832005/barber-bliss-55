 import { useState, useEffect } from "react";
 import { supabase } from "@/lib/supabase";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Scissors } from "lucide-react";
import PaymentStatusBadge from "@/components/pix/PaymentStatusBadge";
import AppointmentManageModal from "@/components/dashboard/AppointmentManageModal";
 import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  created_by: string | null;
  client_name: string | null;
  client: { full_name: string } | null;
  service: { name: string; duration_minutes: number; price: number } | null;
}
 
 interface GroupedAppointments {
   label: string;
   date: string;
   appointments: UpcomingAppointment[];
 }
 
 interface UpcomingAppointmentsProps {
   barberId: string;
 }
 
const UpcomingAppointments = ({ barberId }: UpcomingAppointmentsProps) => {
    const [groupedAppointments, setGroupedAppointments] = useState<GroupedAppointments[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
 
   useEffect(() => {
     if (barberId) {
       fetchUpcomingAppointments();
     }
   }, [barberId]);
 
   const fetchUpcomingAppointments = async () => {
     setIsLoading(true);
     
      const now = new Date();
      const tomorrowStr = format(addDays(startOfDay(now), 1), "yyyy-MM-dd");
      
      // Fetch only future appointments (starting from tomorrow)
      const { data, error } = await supabase
        .from("appointments")
       .select(`
           id,
           appointment_date,
           start_time,
           end_time,
           status,
           payment_status,
           created_by,
           client_name,
           client:profiles!appointments_client_id_fkey(full_name),
           service:services(name, duration_minutes, price)
         `)
        .eq("barber_id", barberId)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .gte("appointment_date", tomorrowStr)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(50);
 
     if (error) {
       console.error("Error fetching appointments:", error);
       setIsLoading(false);
       return;
     }
 
     // Group appointments by day
     const grouped = groupAppointmentsByDay(data as UpcomingAppointment[]);
     setGroupedAppointments(grouped);
     setIsLoading(false);
   };
 
   const groupAppointmentsByDay = (appointments: UpcomingAppointment[]): GroupedAppointments[] => {
     const groups: Map<string, GroupedAppointments> = new Map();
 
     appointments.forEach((apt) => {
       const date = apt.appointment_date;
       const dateObj = new Date(date + "T00:00:00");
       
       let label: string;
       if (isToday(dateObj)) {
         label = "Hoje";
       } else if (isTomorrow(dateObj)) {
         label = "Amanhã";
       } else {
         label = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
       }
 
       if (!groups.has(date)) {
         groups.set(date, { label, date, appointments: [] });
       }
       groups.get(date)!.appointments.push(apt);
     });
 
     return Array.from(groups.values());
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "scheduled":
         return <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>;
       case "completed":
         return <Badge className="bg-success/20 text-success border-success/30">Concluído</Badge>;
       case "cancelled":
         return <Badge variant="destructive">Cancelado</Badge>;
       default:
         return <Badge variant="secondary">{status}</Badge>;
     }
   };
 
   if (isLoading) {
     return (
       <Card className="glass-card">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5 text-primary" />
             Próximos Agendamentos
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
           <Calendar className="h-5 w-5 text-primary" />
           Próximos Agendamentos
         </CardTitle>
       </CardHeader>
       <CardContent>
         {groupedAppointments.length === 0 ? (
           <p className="py-8 text-center text-muted-foreground">
             Nenhum agendamento futuro
           </p>
         ) : (
           <div className="space-y-6">
             {groupedAppointments.map((group) => (
               <div key={group.date}>
                 <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                   {group.label}
                 </h3>
                 <div className="space-y-3">
                    {group.appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment({
                            id: apt.id,
                            clientName: apt.client?.full_name || apt.client_name || "Cliente avulso",
                            serviceName: apt.service?.name || "",
                            startTime: apt.start_time,
                            date: format(new Date(apt.appointment_date + "T00:00:00"), "d/MM", { locale: ptBR }),
                            paymentStatus: apt.payment_status,
                          });
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Time block */}
                          <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-3 py-2 text-primary">
                            <span className="text-lg font-bold leading-tight">
                              {apt.start_time.slice(0, 5)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {apt.end_time.slice(0, 5)}
                            </span>
                          </div>
                          
                          {/* Details */}
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                               <User className="h-4 w-4 text-muted-foreground" />
                               <span className="font-medium">
                                 {apt.client?.full_name || apt.client_name || "Cliente avulso"}
                               </span>
                               {apt.created_by && (
                                 <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Manual</Badge>
                               )}
                             </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <Scissors className="h-3.5 w-3.5" />
                               <span>{apt.service?.name || "Serviço não especificado"}</span>
                               <span className="text-xs">•</span>
                               <Clock className="h-3.5 w-3.5" />
                               <span>{apt.service?.duration_minutes || 0} min</span>
                               <span className="text-xs">•</span>
                               <span className="font-medium text-foreground">R$ {apt.service?.price?.toFixed(2) || "0.00"}</span>
                             </div>
                          </div>
                        </div>
                        
                         {/* Status and Payment badges */}
                         <div className="flex flex-col items-end gap-1 self-start sm:self-center">
                           {getStatusBadge(apt.status)}
                           <PaymentStatusBadge status={apt.payment_status} />
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <AppointmentManageModal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          appointment={selectedAppointment}
          onUpdated={fetchUpcomingAppointments}
        />
      </Card>
    );
  };
  
  export default UpcomingAppointments;