import { User, GraduationCap, Hash, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignedImage } from "@/components/SignedImage";

export interface StudentInfo {
  id: string;
  name: string;
  nisn: string;
  class: string;
  photo?: string;
}

export type AttendanceStatus = "success" | "already" | "not-found" | "idle";

interface StudentInfoCardProps {
  student: StudentInfo | null;
  status: AttendanceStatus;
  timestamp?: Date;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Absensi Berhasil",
    bgClass: "bg-success/10 border-success/30",
    iconClass: "text-success",
    textClass: "text-success",
  },
  already: {
    icon: Clock,
    label: "Sudah Absen Hari Ini",
    bgClass: "bg-warning/10 border-warning/30",
    iconClass: "text-warning",
    textClass: "text-warning",
  },
  "not-found": {
    icon: XCircle,
    label: "Wajah Tidak Dikenali",
    bgClass: "bg-destructive/10 border-destructive/30",
    iconClass: "text-destructive",
    textClass: "text-destructive",
  },
  idle: {
    icon: User,
    label: "Menunggu Deteksi",
    bgClass: "bg-secondary border-border",
    iconClass: "text-muted-foreground",
    textClass: "text-muted-foreground",
  },
};

export function StudentInfoCard({ student, status, timestamp }: StudentInfoCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      "rounded-xl border-2 p-6 transition-smooth animate-fade-in-up",
      config.bgClass
    )}>
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-4">
        <StatusIcon className={cn("w-6 h-6", config.iconClass)} />
        <span className={cn("font-semibold text-lg", config.textClass)}>
          {config.label}
        </span>
      </div>

      {student ? (
        <div className="flex items-start gap-4">
          {/* Student Photo */}
          <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
            {student.photo ? (
              <SignedImage 
                storageSrc={student.photo} 
                alt={student.name}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Student Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground truncate">
              {student.name}
            </h3>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span>NISN: {student.nisn}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="w-4 h-4 flex-shrink-0" />
                <span>Kelas: {student.class}</span>
              </div>
            </div>

            {timestamp && (
              <p className="mt-3 text-xs text-muted-foreground">
                Waktu: {timestamp.toLocaleTimeString('id-ID')} - {timestamp.toLocaleDateString('id-ID')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Arahkan wajah siswa ke kamera untuk memulai absensi
          </p>
        </div>
      )}
    </div>
  );
}
