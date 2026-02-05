import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import BarberDashboard from "@/components/dashboard/BarberDashboard";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
 import AdminDashboard from "./AdminDashboard";
 import PendingApproval from "./PendingApproval";
 import RejectedAccess from "./RejectedAccess";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
   const { profile, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

   // Check if user is admin
   if (isAdmin) {
     return <AdminDashboard />;
   }
 
   // Check barber status
   if (profile.role === "barber") {
     if (profile.barber_status === "pending") {
       return <PendingApproval />;
     }
     if (profile.barber_status === "rejected") {
       return <RejectedAccess />;
     }
     // Only approved barbers get access
     return <BarberDashboard />;
   }
 
   return <ClientDashboard />;
};

export default Dashboard;
