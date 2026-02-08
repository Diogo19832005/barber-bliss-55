import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Scissors, 
  Calendar, 
  Clock, 
  Settings, 
  LogOut, 
  Home,
  DollarSign,
  User,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  bottomTabItems?: NavItem[];
}

const DashboardLayout = ({ children, navItems, bottomTabItems }: DashboardLayoutProps) => {
  const tabs = bottomTabItems || navItems.slice(0, 5);
  const { profile, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleLabel = () => {
    if (isAdmin) return "Administrador";
    if (profile?.role === "barber") return "Barbeiro";
    return "Cliente";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-gold">
            <Scissors className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Barber Office</span>
        </div>
        <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background md:hidden">
          <div className="flex h-full flex-col pt-20">
            <nav className="flex-1 space-y-1 px-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    (location.pathname === item.href || 
                     (item.href === "/dashboard" && (location.pathname === "/dashboard" || location.pathname === "/dashboard/")))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              {/* Link para página pública - apenas barbeiros */}
              {profile?.role === "barber" && profile?.slug_final && (
                <a
                  href={`/${profile.slug_final}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver página pública
                </a>
              )}
            </nav>
            <div className="border-t border-border p-4">
              <div className="mb-4 flex items-center gap-3 px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar md:block">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-3 border-b border-border px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-gold">
                <Scissors className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Barber Office</span>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    (location.pathname === item.href || 
                     (item.href === "/dashboard" && (location.pathname === "/dashboard" || location.pathname === "/dashboard/")))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-border p-4">
              <div className="mb-4 flex items-center gap-3 px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          <div className="p-3 pb-24 md:p-8 md:pb-8 max-w-full overflow-x-hidden">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href === "/dashboard" && (location.pathname === "/dashboard" || location.pathname === "/dashboard/"));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors text-muted-foreground"
            )}
          >
            <Menu className="h-4 w-4" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
