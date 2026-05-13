import { useState, useEffect } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight, Loader2, ScanFace, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolSettings, useSiteSettings } from "@/hooks/useSettings";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const SIDEBAR_STATE_KEY = "sidebar-collapsed";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  isCenter?: boolean;
}

interface RoleLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  title: string;
  subtitle?: string;
}

export function RoleLayout({ children, menuItems, title, subtitle }: RoleLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved === "true";
  });
  const { data: schoolSettings } = useSchoolSettings();
  const { data: siteSettings } = useSiteSettings();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (siteSettings?.siteTitle) {
      document.title = siteSettings.siteTitle;
    } else if (schoolSettings?.schoolName) {
      document.title = `${schoolSettings.schoolName} - ${title}`;
    }
  }, [siteSettings?.siteTitle, schoolSettings?.schoolName, title]);

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
    <div className="flex min-h-screen bg-background w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-300",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 border-b border-border",
          isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-6"
        )}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            {schoolSettings?.schoolLogo ? (
              <img src={schoolSettings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ScanFace className="w-6 h-6 text-primary-foreground" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">{title}</h1>
              <p className="text-xs text-muted-foreground truncate">{subtitle || schoolSettings?.schoolName || "Sekolah"}</p>
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
                      isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span className="animate-fade-in">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: Theme + Logout + Toggle */}
        <div className="px-3 py-2 space-y-1 border-t border-border">
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "justify-between px-1")}>
            <ThemeToggle />
            {!isSidebarCollapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full text-muted-foreground hover:text-destructive",
              isSidebarCollapsed ? "justify-center" : "justify-start gap-3"
            )}
          >
            {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            {!isSidebarCollapsed && <span>Keluar</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "w-full text-muted-foreground hover:text-foreground",
              isSidebarCollapsed ? "justify-center" : "justify-start gap-3"
            )}
          >
            {isSidebarCollapsed ? (
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                {schoolSettings?.schoolLogo ? (
                  <img src={schoolSettings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ScanFace className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-foreground leading-tight truncate">{title}</h1>
                <p className="text-[10px] text-muted-foreground truncate">{subtitle || schoolSettings?.schoolName || "Sekolah"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{format(new Date(), "EEEE, d MMM yyyy", { locale: localeId })}</span>
                <span className="sm:hidden">{format(new Date(), "d MMM", { locale: localeId })}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-inset-bottom">
        <ul className="flex items-center justify-between h-16 px-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isCenter = item.isCenter;
            return (
              <li key={item.path} className="flex-1 flex justify-center">
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition-all duration-200 min-w-0",
                    isCenter
                      ? "-mt-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground active:scale-95"
                  )}
                >
                  <item.icon className={cn(
                    "flex-shrink-0",
                    isCenter ? "w-6 h-6" : "w-5 h-5",
                    !isCenter && isActive && "text-primary"
                  )} />
                  <span className={cn(
                    "font-medium truncate max-w-full px-0.5",
                    isCenter ? "text-[9px]" : "text-[10px]",
                    !isCenter && isActive && "text-primary"
                  )}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
