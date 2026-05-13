import { CheckCircle2, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignedImage } from "@/components/SignedImage";

export interface AttendanceRecord {
  id: string;
  studentName: string;
  studentClass: string;
  photoUrl?: string;
  time: Date;
  status: "ontime" | "late";
}

interface RecentAttendanceProps {
  records: AttendanceRecord[];
}

export function RecentAttendance({ records }: RecentAttendanceProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Absensi Terkini</h3>
        <p className="text-sm text-muted-foreground">10 siswa terakhir yang melakukan absensi</p>
      </div>

      <div className="divide-y divide-border">
        {records.length > 0 ? (
          records.slice(0, 10).map((record, index) => (
            <div 
              key={record.id}
              className={cn(
                "px-5 py-3 flex items-center gap-4 hover:bg-secondary/50 transition-colors",
                index === 0 && "bg-success/5"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                {record.photoUrl ? (
                  <SignedImage storageSrc={record.photoUrl} alt={record.studentName} className="w-full h-full object-cover" fallback={<User className="w-5 h-5 text-muted-foreground" />} />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {record.studentName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {record.studentClass}
                </p>
              </div>

              {/* Status & Time */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 justify-end">
                  {record.status === "ontime" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-sm text-success font-medium">Tepat Waktu</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning font-medium">Terlambat</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {record.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Belum ada absensi hari ini</p>
          </div>
        )}
      </div>
    </div>
  );
}
