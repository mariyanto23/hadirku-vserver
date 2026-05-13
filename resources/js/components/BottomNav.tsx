import { ScanFace, Users, FileText, Home, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: Home, label: "Beranda", path: "/" },
  { icon: Users, label: "Data", path: "/students" },
  { icon: ScanFace, label: "Presensi", path: "/attendance", isCenter: true },
  { icon: FileText, label: "Rekap", path: "/reports" },
  { icon: Settings, label: "Pengaturan", path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-inset-bottom">
      <ul className="flex items-center justify-between h-16 px-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCenter = 'isCenter' in item && item.isCenter;
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
  );
}
