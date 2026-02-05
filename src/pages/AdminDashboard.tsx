 import { useState, useEffect } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/lib/supabase";
 import DashboardLayout from "@/components/dashboard/DashboardLayout";
 import { 
   Shield, 
   Users, 
   CheckCircle, 
   XCircle, 
   Clock, 
   UserPlus,
   Mail,
   Loader2
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Navigate } from "react-router-dom";
 
 interface Barber {
   id: string;
   user_id: string;
   full_name: string;
   phone: string | null;
   barber_status: string;
   created_at: string;
   public_id: number | null;
   slug_final: string | null;
 }
 
 interface Admin {
   id: string;
   user_id: string;
   created_at: string;
   email?: string;
 }
 
 const navItems = [
   { label: "Barbeiros", href: "/admin", icon: <Users className="h-4 w-4" /> },
   { label: "Administradores", href: "/admin/admins", icon: <Shield className="h-4 w-4" /> },
 ];
 
 const AdminDashboard = () => {
   const { profile, user, isAdmin, isLoading: authLoading } = useAuth();
   const { toast } = useToast();
   const [barbers, setBarbers] = useState<Barber[]>([]);
   const [admins, setAdmins] = useState<Admin[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [processingId, setProcessingId] = useState<string | null>(null);
   const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
   const [newAdminEmail, setNewAdminEmail] = useState("");
   const [isAddingAdmin, setIsAddingAdmin] = useState(false);
 
   useEffect(() => {
     if (isAdmin) {
       fetchData();
     }
   }, [isAdmin]);
 
   const fetchData = async () => {
     setIsLoading(true);
 
     // Fetch all barbers
     const { data: barbersData } = await supabase
       .from("profiles")
       .select("id, user_id, full_name, phone, barber_status, created_at, public_id, slug_final")
       .eq("role", "barber")
       .order("created_at", { ascending: false });
 
     if (barbersData) setBarbers(barbersData);
 
     // Fetch admins
     const { data: adminsData } = await supabase
       .from("user_roles")
       .select("id, user_id, created_at")
       .eq("role", "admin");
 
     if (adminsData) setAdmins(adminsData);
 
     setIsLoading(false);
   };
 
   const handleApprove = async (barberId: string) => {
     setProcessingId(barberId);
 
     const { error } = await supabase
       .from("profiles")
       .update({ barber_status: "approved" })
       .eq("id", barberId);
 
     if (error) {
       toast({
         title: "Erro ao aprovar",
         description: error.message,
         variant: "destructive",
       });
     } else {
       toast({ title: "Barbeiro aprovado com sucesso!" });
       fetchData();
     }
 
     setProcessingId(null);
   };
 
   const handleReject = async (barberId: string) => {
     setProcessingId(barberId);
 
     const { error } = await supabase
       .from("profiles")
       .update({ barber_status: "rejected" })
       .eq("id", barberId);
 
     if (error) {
       toast({
         title: "Erro ao recusar",
         description: error.message,
         variant: "destructive",
       });
     } else {
       toast({ title: "Barbeiro recusado" });
       fetchData();
     }
 
     setProcessingId(null);
   };
 
   const handleAddAdmin = async () => {
     if (!newAdminEmail.trim()) return;
 
     setIsAddingAdmin(true);
 
     // Find user by email in profiles
     const { data: userData, error: userError } = await supabase
       .from("profiles")
       .select("user_id")
       .eq("full_name", newAdminEmail.trim())
       .maybeSingle();
 
     // Try to find by checking auth (we'll need to lookup differently)
     // Since we can't directly query auth.users, we'll add by user_id from profiles
     const { data: profileData } = await supabase
       .from("profiles")
       .select("user_id, full_name")
       .ilike("full_name", `%${newAdminEmail.trim()}%`)
       .maybeSingle();
 
     if (!profileData) {
       toast({
         title: "Usuário não encontrado",
         description: "Nenhum usuário encontrado com esse nome",
         variant: "destructive",
       });
       setIsAddingAdmin(false);
       return;
     }
 
     const { error } = await supabase
       .from("user_roles")
       .insert({ user_id: profileData.user_id, role: "admin" });
 
     if (error) {
       toast({
         title: "Erro ao adicionar admin",
         description: error.message,
         variant: "destructive",
       });
     } else {
       toast({ title: "Administrador adicionado!" });
       setNewAdminEmail("");
       setIsAddAdminOpen(false);
       fetchData();
     }
 
     setIsAddingAdmin(false);
   };
 
   const handleRemoveAdmin = async (adminId: string, adminUserId: string) => {
     // Can't remove yourself
     if (adminUserId === user?.id) {
       toast({
         title: "Ação não permitida",
         description: "Você não pode remover a si mesmo",
         variant: "destructive",
       });
       return;
     }
 
     const { error } = await supabase
       .from("user_roles")
       .delete()
       .eq("id", adminId);
 
     if (error) {
       toast({
         title: "Erro ao remover",
         description: error.message,
         variant: "destructive",
       });
     } else {
       toast({ title: "Administrador removido" });
       fetchData();
     }
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "pending":
         return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
       case "approved":
         return <Badge variant="outline" className="border-success text-success"><CheckCircle className="mr-1 h-3 w-3" />Aprovado</Badge>;
       case "rejected":
         return <Badge variant="outline" className="border-destructive text-destructive"><XCircle className="mr-1 h-3 w-3" />Recusado</Badge>;
       default:
         return null;
     }
   };
 
   const pendingBarbers = barbers.filter(b => b.barber_status === "pending");
   const approvedBarbers = barbers.filter(b => b.barber_status === "approved");
   const rejectedBarbers = barbers.filter(b => b.barber_status === "rejected");
 
   if (authLoading || isLoading) {
     return (
       <DashboardLayout navItems={navItems}>
         <div className="flex min-h-[400px] items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </DashboardLayout>
     );
   }
 
   // Redirect non-admins to dashboard
   if (!isAdmin) {
     return <Navigate to="/dashboard" replace />;
   }
 
   return (
     <DashboardLayout navItems={navItems}>
       <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold md:text-3xl">
               Painel Administrativo
             </h1>
             <p className="text-muted-foreground">
               Gerencie barbeiros e administradores
             </p>
           </div>
           <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
             <Shield className="h-5 w-5 text-primary" />
           </div>
         </div>
 
         {/* Stats */}
         <div className="grid gap-4 md:grid-cols-3">
           <Card className="glass-card">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
                 <Clock className="h-4 w-4" />
                 Pendentes
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold">{pendingBarbers.length}</p>
             </CardContent>
           </Card>
           <Card className="glass-card">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-sm font-medium text-success">
                 <CheckCircle className="h-4 w-4" />
                 Aprovados
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold">{approvedBarbers.length}</p>
             </CardContent>
           </Card>
           <Card className="glass-card">
             <CardHeader className="pb-2">
               <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
                 <XCircle className="h-4 w-4" />
                 Recusados
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold">{rejectedBarbers.length}</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Pending Barbers */}
         {pendingBarbers.length > 0 && (
           <Card className="glass-card border-warning/30">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-warning">
                 <Clock className="h-5 w-5" />
                 Barbeiros Aguardando Aprovação
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               {pendingBarbers.map((barber) => (
                 <div
                   key={barber.id}
                   className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                 >
                   <div>
                     <p className="font-medium">{barber.full_name}</p>
                     <p className="text-sm text-muted-foreground">
                       {barber.phone || "Sem telefone"} • Cadastrado em {new Date(barber.created_at).toLocaleDateString("pt-BR")}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     <Button
                       size="sm"
                       variant="outline"
                       className="border-success text-success hover:bg-success hover:text-success-foreground"
                       onClick={() => handleApprove(barber.id)}
                       disabled={processingId === barber.id}
                     >
                       {processingId === barber.id ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                       ) : (
                         <>
                           <CheckCircle className="mr-1 h-4 w-4" />
                           Aprovar
                         </>
                       )}
                     </Button>
                     <Button
                       size="sm"
                       variant="outline"
                       className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                       onClick={() => handleReject(barber.id)}
                       disabled={processingId === barber.id}
                     >
                       <XCircle className="mr-1 h-4 w-4" />
                       Recusar
                     </Button>
                   </div>
                 </div>
               ))}
             </CardContent>
           </Card>
         )}
 
         {/* All Barbers */}
         <Card className="glass-card">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Users className="h-5 w-5 text-primary" />
               Todos os Barbeiros
             </CardTitle>
           </CardHeader>
           <CardContent>
             {barbers.length === 0 ? (
               <p className="py-8 text-center text-muted-foreground">
                 Nenhum barbeiro cadastrado
               </p>
             ) : (
               <div className="space-y-3">
                 {barbers.map((barber) => (
                   <div
                     key={barber.id}
                     className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                   >
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <p className="font-medium">{barber.full_name}</p>
                         {getStatusBadge(barber.barber_status)}
                       </div>
                       <p className="text-sm text-muted-foreground">
                         {barber.phone || "Sem telefone"}
                         {barber.slug_final && ` • /${barber.slug_final}`}
                       </p>
                     </div>
                     {barber.barber_status !== "approved" && (
                       <Button
                         size="sm"
                         variant="outline"
                         className="border-success text-success"
                         onClick={() => handleApprove(barber.id)}
                         disabled={processingId === barber.id}
                       >
                         <CheckCircle className="mr-1 h-4 w-4" />
                         Aprovar
                       </Button>
                     )}
                     {barber.barber_status === "approved" && (
                       <Button
                         size="sm"
                         variant="outline"
                         className="border-destructive text-destructive"
                         onClick={() => handleReject(barber.id)}
                         disabled={processingId === barber.id}
                       >
                         <XCircle className="mr-1 h-4 w-4" />
                         Suspender
                       </Button>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Admins */}
         <Card className="glass-card">
           <CardHeader className="flex flex-row items-center justify-between">
             <CardTitle className="flex items-center gap-2">
               <Shield className="h-5 w-5 text-primary" />
               Administradores
             </CardTitle>
             <Button
               variant="gold"
               size="sm"
               onClick={() => setIsAddAdminOpen(true)}
             >
               <UserPlus className="mr-2 h-4 w-4" />
               Adicionar
             </Button>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {admins.map((admin) => (
                 <div
                   key={admin.id}
                   className="flex items-center justify-between rounded-xl border border-border p-4"
                 >
                   <div className="flex items-center gap-3">
                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                       <Shield className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                       <p className="font-medium">
                         {admin.user_id === user?.id ? "Você" : `Admin ${admin.id.slice(0, 8)}`}
                       </p>
                       <p className="text-sm text-muted-foreground">
                         Desde {new Date(admin.created_at).toLocaleDateString("pt-BR")}
                       </p>
                     </div>
                   </div>
                   {admin.user_id !== user?.id && (
                     <Button
                       size="sm"
                       variant="ghost"
                       className="text-destructive hover:text-destructive"
                       onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                     >
                       <XCircle className="h-4 w-4" />
                     </Button>
                   )}
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Add Admin Dialog */}
       <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Adicionar Administrador</DialogTitle>
             <DialogDescription>
               Digite o nome do usuário que deseja tornar administrador
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="adminName">Nome do usuário</Label>
               <Input
                 id="adminName"
                 value={newAdminEmail}
                 onChange={(e) => setNewAdminEmail(e.target.value)}
                 placeholder="Nome completo do usuário"
                 className="bg-secondary/50"
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>
               Cancelar
             </Button>
             <Button
               variant="gold"
               onClick={handleAddAdmin}
               disabled={isAddingAdmin || !newAdminEmail.trim()}
             >
               {isAddingAdmin ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 "Adicionar"
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </DashboardLayout>
   );
 };
 
 export default AdminDashboard;