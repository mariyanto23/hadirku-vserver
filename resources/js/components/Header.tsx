import { ScanFace, Settings, Bell, Calendar } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: schoolSettings } = useSchoolSettings();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
              {schoolSettings?.schoolLogo ? (
                <img src={schoolSettings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ScanFace className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{schoolSettings?.schoolName || "Sistem Presensi"}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{schoolSettings?.adminName || "Admin"}</p>
            </div>
          </div>

          {/* Date */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold ml-2">
              A
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
