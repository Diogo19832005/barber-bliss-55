 import { XCircle, LogOut } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/contexts/AuthContext";
 
 const RejectedAccess = () => {
   const { signOut } = useAuth();
 
   return (
     <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="glass-card max-w-md p-8 text-center">
         <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
           <XCircle className="h-10 w-10 text-destructive" />
         </div>
         
         <h1 className="mt-6 text-2xl font-bold">Acesso Negado</h1>
         
         <p className="mt-4 text-muted-foreground">
           Infelizmente seu cadastro como barbeiro não foi aprovado.
           Entre em contato com o administrador para mais informações.
         </p>
 
         <Button
           variant="outline"
           className="mt-8"
           onClick={() => signOut()}
         >
           <LogOut className="mr-2 h-4 w-4" />
           Sair
         </Button>
       </div>
     </div>
   );
 };
 
 export default RejectedAccess;