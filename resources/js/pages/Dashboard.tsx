import { Users, ScanFace, FileText, CalendarDays, Clock, Activity, AlertTriangle, CheckCircle2, Circle, UserX, RefreshCw } from "lucide-react";
import { LeaveRequestsAdmin } from "@/components/LeaveRequestsAdmin";
import { useNavigate } from "react-router-dom";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useStudents } from "@/hooks/useStudents";
import { useAttendanceSettings, useSchoolSettings, useSiteSettings } from "@/hooks/useSettings";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { HolidayBanner, useIsTodayOff } from "@/components/HolidayBanner";

interface MenuCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function MenuCard({ icon, title, description, onClick }: MenuCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardContent className="p-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getAttendanceStatus(settings: { attendanceStart: string; attendanceEnd: string }) {
  const now = new Date();
  const currentTime = format(now, "HH:mm");
  
  if (currentTime < settings.attendanceStart) {
    return { label: "Belum Dibuka", variant: "secondary" as const, color: "text-muted-foreground" };
  } else if (currentTime >= settings.attendanceStart && currentTime <= settings.attendanceEnd) {
    return { label: "Sedang Berlangsung", variant: "default" as const, color: "text-success" };
  } else {
    return { label: "Sudah Ditutup", variant: "outline" as const, color: "text-destructive" };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: students = [] } = useStudents();
  const { data: todayAttendance = [] } = useTodayAttendance();
  const { data: attendanceSettings } = useAttendanceSettings();
  const { data: schoolSettings } = useSchoolSettings();
  const { data: siteSettings } = useSiteSettings();
  const todayHoliday = useIsTodayOff();
  const totalStudents = students.length;
  const presentToday = todayAttendance.filter(a => a.status === "hadir").length;
  const lateToday = todayAttendance.filter(a => a.status === "terlambat").length;
  const izinToday = todayAttendance.filter(a => a.status === "izin").length;
  const sakitToday = todayAttendance.filter(a => a.status === "sakit").length;
  const attendedCount = presentToday + lateToday;
  const absentToday = totalStudents - attendedCount - izinToday - sakitToday;
  const progressPercent = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0;

  const status = useMemo(() => {
    if (!attendanceSettings) return { label: "Memuat...", variant: "secondary" as const, color: "text-muted-foreground" };
    return getAttendanceStatus(attendanceSettings);
  }, [attendanceSettings]);

  const absentStudents = useMemo(() => {
    const attendedIds = new Set(todayAttendance.map(a => a.student_id));
    return students.filter(s => !attendedIds.has(s.id));
  }, [students, todayAttendance]);
  const absentCount = absentStudents.length;

  const recentActivity = useMemo(() => {
    return [...todayAttendance]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 3);
  }, [todayAttendance]);

  const contextualAction = useMemo(() => {
    if (!attendanceSettings) return null;
    const currentTime = format(new Date(), "HH:mm");
    if (currentTime < attendanceSettings.attendanceStart) {
      return { label: "Buka Presensi", path: "/attendance", icon: ScanFace };
    } else if (currentTime <= attendanceSettings.attendanceEnd) {
      if (absentToday > 0) {
        return { label: "Lihat Belum Hadir", path: "/reports?status=tidak-hadir", icon: UserX };
      }
      return { label: "Mulai Presensi", path: "/attendance", icon: ScanFace };
    } else {
      return { label: "Lihat Rekap", path: "/reports", icon: FileText };
    }
  }, [attendanceSettings, absentToday]);

  const menuItems = [
    {
      icon: <Users className={isMobile ? "w-5 h-5 text-primary" : "w-10 h-10 text-primary"} />,
      title: "Kelola Siswa",
      description: "Tambah, edit, dan kelola data siswa beserta foto wajah",
      path: "/students"
    },
    {
      icon: <ScanFace className={isMobile ? "w-5 h-5 text-primary" : "w-10 h-10 text-primary"} />,
      title: "Mulai Presensi",
      description: "Lakukan presensi siswa menggunakan pengenalan wajah",
      path: "/attendance"
    },
    {
      icon: <FileText className={isMobile ? "w-5 h-5 text-primary" : "w-10 h-10 text-primary"} />,
      title: "Rekap Presensi",
      description: "Lihat dan unduh laporan rekap presensi siswa",
      path: "/reports"
    }
  ];

  if (isMobile) {
    return (
      <div className="p-4 space-y-3 pb-24">
        {/* Header: Date + Status Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Halo, {schoolSettings?.adminName || "Admin"}!</h2>
            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <CalendarDays className="w-3 h-3" />
              <p className="text-[11px] font-medium">
                {format(new Date(), "EEEE, d MMM yyyy", { locale: localeId })}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={status.variant} className="text-[10px] px-2 py-0.5">
              {status.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Circle className="w-2 h-2 fill-success text-success animate-pulse" />
              Data hari ini
            </span>
          </div>
        </div>

        {/* Holiday Banner */}
        <HolidayBanner compact />

        {/* Attendance Time Info */}
        {attendanceSettings && !todayHoliday && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Presensi: <span className="font-semibold text-foreground">{attendanceSettings.attendanceStart}–{attendanceSettings.attendanceEnd}</span>
              {" | "}Terlambat {"> "}<span className="font-semibold text-warning">{attendanceSettings.lateThreshold}</span>
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">Kehadiran Hari Ini</span>
            <span className="text-xs font-bold text-primary">{attendedCount}/{totalStudents}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">{progressPercent}% siswa sudah hadir</p>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Hadir", value: presentToday, color: "text-success" },
            { label: "Terlambat", value: lateToday, color: "text-warning" },
            { label: "Izin", value: izinToday, color: "text-primary" },
            { label: "Sakit", value: sakitToday, color: "text-primary" },
            { label: "Tidak Hadir", value: absentToday, color: "text-destructive" },
            { label: "Total", value: totalStudents, color: "text-foreground" },
          ].map(stat => (
            <div key={stat.label} className="text-center p-2 rounded-lg bg-card border border-border">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Absent Students Preview */}
        {totalStudents > 0 && absentToday > 0 && (
          <div className="px-3 py-2.5 rounded-lg bg-destructive/5 border border-destructive/15">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                <UserX className="w-3 h-3" /> Belum Hadir
              </span>
              {absentToday > 3 && (
                <button onClick={() => navigate("/reports?status=tidak-hadir")} className="text-[10px] text-primary font-medium">
                  Lihat semua →
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {absentStudents.slice(0, 3).map(s => s.name).join(", ")}
              {absentToday > 3 && ` dan ${absentToday - 3} lainnya`}
            </p>
          </div>
        )}

        {/* Empty State */}
        {totalStudents > 0 && todayAttendance.length === 0 && (
          <div className="px-3 py-3 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-xs text-muted-foreground">Belum ada siswa yang melakukan presensi hari ini.</p>
          </div>
        )}

        {totalStudents === 0 && (
          <div className="px-3 py-3 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-xs text-muted-foreground">Belum ada data siswa. Tambahkan siswa terlebih dahulu.</p>
            <button onClick={() => navigate("/students")} className="text-xs text-primary font-medium mt-1">
              + Tambah Siswa
            </button>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-1 mb-1.5">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Aktivitas Terbaru</span>
            </div>
            <div className="space-y-1">
              {recentActivity.map(record => (
                <div key={record.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground font-mono w-10 flex-shrink-0">
                    {record.time.slice(0, 5)}
                  </span>
                  <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${record.status === "hadir" ? "text-success" : "text-warning"}`} />
                  <span className="text-foreground truncate">{record.student_name}</span>
                  {record.status === "terlambat" && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30">Terlambat</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Action Button */}
        {contextualAction && (
          <button
            onClick={() => navigate(contextualAction.path)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all"
          >
            <contextualAction.icon className="w-4 h-4" />
            {contextualAction.label}
          </button>
        )}

        {/* Quick Menu */}
        <div className="grid grid-cols-3 gap-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border active:scale-95 transition-all"
              onClick={() => navigate(item.path)}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[10px] font-medium text-foreground">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{siteSettings?.welcomeMessage || "Selamat Datang"}, {schoolSettings?.adminName || "Admin"}!</h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <CalendarDays className="w-4 h-4" />
              <p className="text-sm font-medium">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Circle className="w-2 h-2 fill-success text-success animate-pulse" />
              Data real-time
            </span>
            <Badge variant={status.variant} className="text-xs px-3 py-1">
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Holiday Banner */}
        <HolidayBanner />

        {/* Time info + Progress row */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {attendanceSettings && !todayHoliday && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Jam Presensi Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    {attendanceSettings.attendanceStart} – {attendanceSettings.attendanceEnd}
                    {" · "}Terlambat {">"} <span className="text-warning font-medium">{attendanceSettings.lateThreshold}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Progress Kehadiran</p>
                <span className="text-sm font-bold text-primary">{attendedCount}/{totalStudents} siswa</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-1.5">{progressPercent}% sudah melakukan presensi hari ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <AttendanceStats
            totalStudents={totalStudents}
            presentToday={presentToday}
            absentToday={absentToday}
            lateToday={lateToday}
            izinToday={izinToday}
            sakitToday={sakitToday}
          />
        </div>

        {/* Bottom grid: Activity + Absent + Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Recent Activity */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Aktivitas Terbaru</h3>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map(record => (
                    <div key={record.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-mono text-xs w-12 flex-shrink-0">
                        {record.time.slice(0, 5)}
                      </span>
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${record.status === "hadir" ? "text-success" : "text-warning"}`} />
                      <span className="text-foreground truncate">{record.student_name}</span>
                      {record.status === "terlambat" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-warning border-warning/30">Terlambat</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas presensi hari ini.</p>
              )}
            </CardContent>
          </Card>

          {/* Absent Students */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-foreground">Belum Hadir</h3>
                </div>
                {absentToday > 5 && (
                  <button onClick={() => navigate("/reports?status=tidak-hadir")} className="text-xs text-primary font-medium hover:underline">
                    Lihat semua →
                  </button>
                )}
              </div>
              {totalStudents === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data siswa.</p>
              ) : absentToday === 0 ? (
                <p className="text-sm text-success font-medium">Semua siswa sudah hadir! 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {absentStudents.slice(0, 5).map(s => (
                    <p key={s.id} className="text-sm text-muted-foreground truncate">• {s.name}</p>
                  ))}
                  {absentToday > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">dan {absentToday - 5} lainnya...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contextual Action */}
          <Card>
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-3">
                <ScanFace className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Aksi Cepat</h3>
              </div>
              {contextualAction && (
                <button
                  onClick={() => navigate(contextualAction.path)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <contextualAction.icon className="w-4 h-4" />
                  {contextualAction.label}
                </button>
              )}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{item.title}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Requests */}
        <LeaveRequestsAdmin />
      </div>
    </div>
  );
}
