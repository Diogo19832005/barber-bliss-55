 import { Link } from "react-router-dom";
 import { Scissors, Clock, LogOut } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/contexts/AuthContext";
 
 const PendingApproval = () => {
   const { signOut } = useAuth();
 
   return (
     <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="glass-card max-w-md p-8 text-center">
         <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/20">
           <Clock className="h-10 w-10 text-warning" />
         </div>
         
         <h1 className="mt-6 text-2xl font-bold">Aguardando Aprovação</h1>
         
         <p className="mt-4 text-muted-foreground">
           Seu cadastro como barbeiro está sendo analisado pelo administrador.
           Você receberá acesso ao sistema assim que for aprovado.
         </p>
 
         <div className="mt-8 rounded-xl bg-secondary/50 p-4">
           <div className="flex items-center justify-center gap-2">
             <Scissors className="h-5 w-5 text-primary" />
             <span className="text-sm font-medium">Barber Control</span>
           </div>
           <p className="mt-2 text-xs text-muted-foreground">
             Obrigado por se cadastrar! Em breve você poderá gerenciar seus horários e atender seus clientes.
           </p>
         </div>
 
         <Button
           variant="outline"
           className="mt-6"
           onClick={() => signOut()}
         >
           <LogOut className="mr-2 h-4 w-4" />
           Sair
         </Button>
       </div>
     </div>
   );
 };
 
 export default PendingApproval;