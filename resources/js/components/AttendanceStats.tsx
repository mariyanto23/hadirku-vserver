import { Users, UserCheck, UserX, Clock, FileText, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  compact?: boolean;
}

const variantStyles = {
  default: "bg-card border-border",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  destructive: "bg-destructive/5 border-destructive/20",
  info: "bg-primary/5 border-primary/20",
};

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

function StatCard({ icon: Icon, label, value, subtext, variant = "default", compact }: StatCardProps) {
  if (compact) {
    return (
      <div className={cn(
        "rounded-xl border p-3 flex items-center gap-3",
        variantStyles[variant]
      )}>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          iconVariantStyles[variant]
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-smooth hover:shadow-card-hover",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          iconVariantStyles[variant]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

interface AttendanceStatsProps {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  izinToday?: number;
  sakitToday?: number;
  compact?: boolean;
}

export function AttendanceStats({ 
  totalStudents, 
  presentToday, 
  absentToday, 
  lateToday,
  izinToday = 0,
  sakitToday = 0,
  compact 
}: AttendanceStatsProps) {
  const presentPercentage = totalStudents > 0 
    ? Math.round((presentToday / totalStudents) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        icon={Users}
        label="Total Siswa"
        value={totalStudents}
        subtext={compact ? undefined : "Terdaftar"}
        variant="default"
        compact={compact}
      />
      <StatCard
        icon={UserCheck}
        label="Hadir"
        value={presentToday}
        subtext={compact ? undefined : `${presentPercentage}% kehadiran`}
        variant="success"
        compact={compact}
      />
      <StatCard
        icon={Clock}
        label="Terlambat"
        value={lateToday}
        subtext={compact ? undefined : "Hari ini"}
        variant="warning"
        compact={compact}
      />
      <StatCard
        icon={FileText}
        label="Izin"
        value={izinToday}
        subtext={compact ? undefined : "Hari ini"}
        variant="info"
        compact={compact}
      />
      <StatCard
        icon={Thermometer}
        label="Sakit"
        value={sakitToday}
        subtext={compact ? undefined : "Hari ini"}
        variant="info"
        compact={compact}
      />
      <StatCard
        icon={UserX}
        label="Tidak Hadir"
        value={absentToday}
        subtext={compact ? undefined : "Hari ini"}
        variant="destructive"
        compact={compact}
      />
    </div>
  );
}
