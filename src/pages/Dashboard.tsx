import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import BarberDashboard from "@/components/dashboard/BarberDashboard";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { profile, isLoading } = useAuth();

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

  return profile.role === "barber" ? <BarberDashboard /> : <ClientDashboard />;
};

export default Dashboard;
