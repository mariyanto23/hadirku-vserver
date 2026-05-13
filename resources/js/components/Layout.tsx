import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { useSchoolSettings, useSiteSettings } from "@/hooks/useSettings";
import { ScanFace, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const SIDEBAR_STATE_KEY = "sidebar-collapsed";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved === "true";
  });
  const { data: schoolSettings } = useSchoolSettings();
  const { data: siteSettings } = useSiteSettings();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Update document title
  useEffect(() => {
    if (siteSettings?.siteTitle) {
      document.title = siteSettings.siteTitle;
    } else if (schoolSettings?.schoolName) {
      document.title = `${schoolSettings.schoolName} - Sistem Presensi`;
    }
  }, [siteSettings?.siteTitle, schoolSettings?.schoolName]);

  // Update favicon
  useEffect(() => {
    if (siteSettings?.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteSettings.favicon;
    }
  }, [siteSettings?.favicon]);

  // Update meta description
  useEffect(() => {
    if (siteSettings?.siteDescription) {
      let meta = document.querySelector("meta[name='description']") as HTMLMetaElement;
      if (meta) meta.content = siteSettings.siteDescription;
    }
  }, [siteSettings?.siteDescription]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
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
                <h1 className="text-sm font-bold text-foreground leading-tight truncate">{schoolSettings?.schoolName || "Sistem Presensi"}</h1>
                <p className="text-[10px] text-muted-foreground truncate">{schoolSettings?.adminName || "Admin"}</p>
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
      <BottomNav />
    </div>
  );
}
