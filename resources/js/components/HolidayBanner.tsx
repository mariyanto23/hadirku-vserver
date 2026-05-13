import { PartyPopper, CalendarOff } from "lucide-react";
import { useIsHoliday } from "@/hooks/useHolidays";
import { useAttendanceSettings } from "@/hooks/useSettings";

interface HolidayBannerProps {
  date?: string;
  compact?: boolean;
}

export function useIsWeekend(date?: string) {
  const { data: settings } = useAttendanceSettings();
  const d = date ? new Date(date + "T00:00:00") : new Date();
  const day = d.getDay();
  const schoolDays = settings?.schoolDays ?? 6;
  if (day === 0) return "Minggu";
  if (schoolDays === 5 && day === 6) return "Sabtu";
  return null;
}

export function HolidayBanner({ date, compact = false }: HolidayBannerProps) {
  const dateStr = date || new Date().toISOString().split("T")[0];
  const holiday = useIsHoliday(dateStr);
  const weekend = useIsWeekend(dateStr);

  const label = holiday?.name || (weekend ? `Hari ${weekend}` : null);
  if (!label) return null;

  const subtitle = holiday
    ? "Hari libur — presensi tidak aktif"
    : "Hari libur mingguan — presensi tidak aktif";
  const Icon = holiday ? PartyPopper : CalendarOff;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
        <Icon className="w-3.5 h-3.5 text-warning flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-warning">{label}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30">
      <Icon className="w-5 h-5 text-warning flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-warning">{label}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function useIsTodayHoliday() {
  const todayStr = new Date().toISOString().split("T")[0];
  return useIsHoliday(todayStr);
}

export function useIsTodayOff() {
  const holiday = useIsTodayHoliday();
  const weekend = useIsWeekend();
  return holiday || weekend ? true : false;
}
