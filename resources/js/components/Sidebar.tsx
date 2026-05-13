import { ScanFace, Users, FileText, Home, Settings, ChevronLeft, ChevronRight, LogOut, Loader2 } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSettings";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

const menuItems = [
  { icon: Home, label: "Beranda", path: "/" },
  { icon: ScanFace, label: "Presensi", path: "/attendance" },
  { icon: Users, label: "Data", path: "/students" },
  { icon: FileText, label: "Rekap", path: "/reports" },
  { icon: Settings, label: "Pengaturan", path: "/settings" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: schoolSettings } = useSchoolSettings();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-border",
        isCollapsed ? "justify-center px-2" : "gap-3 px-6"
      )}>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
          {schoolSettings?.schoolLogo ? (
            <img src={schoolSettings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <ScanFace className="w-6 h-6 text-primary-foreground" />
          )}
        </div>
        {!isCollapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-sm font-bold text-foreground leading-tight">{schoolSettings?.schoolName || "Sekolah"}</h1>
            <p className="text-xs text-muted-foreground truncate">{schoolSettings?.adminName || "Admin"}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-colors",
                    isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Theme + Logout + Toggle */}
      <div className="px-3 py-2 space-y-1 border-t border-border">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-1")}>
          <ThemeToggle />
          {!isCollapsed && <span className="text-xs text-muted-foreground">Tema</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full text-muted-foreground hover:text-destructive",
            isCollapsed ? "justify-center" : "justify-start gap-3"
          )}
        >
          {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
          {!isCollapsed && <span>Keluar</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center" : "justify-start gap-3"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Sembunyikan Menu</span>
            </>
          )}
        </Button>
      </div>

    </aside>
  );
}
