import { useMemo, useEffect } from "react";
import { format, startOfMonth, getDaysInMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2, Clock, AlertCircle, CalendarDays, TrendingUp, ScanFace, ChevronRight, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAttendanceSettings } from "@/hooks/useSettings";
import { HolidayBanner, useIsTodayOff } from "@/components/HolidayBanner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { eachDayOfInterval, subDays, parseISO } from "date-fns";

export default function StudentHome() {
  const { linkedStudentId } = useRole();
  const { data: attendanceSettings } = useAttendanceSettings();
  const isTodayOff = useIsTodayOff();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId });
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const chart14Start = format(subDays(new Date(), 13), "yyyy-MM-dd");

  const { data: student } = useQuery({
    queryKey: ["student-profile", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("id", linkedStudentId)
        .single();
      if (error) throw error;
      return { ...data, class_name: (data.classes as any)?.name || "-" };
    },
    enabled: !!linkedStudentId,
  });

  const { data: todayRecord } = useQuery({
    queryKey: ["student-today", linkedStudentId, today],
    queryFn: async () => {
      if (!linkedStudentId) return null;
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", linkedStudentId)
        .eq("date", today)
        .maybeSingle();
      return data || null;
    },
    enabled: !!linkedStudentId,
    refetchInterval: 30000,
  });

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ["student-month-attendance", linkedStudentId, monthStart],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("date, status")
        .eq("student_id", linkedStudentId)
        .gte("date", monthStart)
        .lte("date", today)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!linkedStudentId,
  });

  const { data: chartAttendance = [] } = useQuery({
    queryKey: ["student-chart", linkedStudentId, chart14Start],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data } = await supabase
        .from("attendance_records")
        .select("date, status")
        .eq("student_id", linkedStudentId)
        .gte("date", chart14Start)
        .lte("date", today)
        .order("date", { ascending: true });
      return data || [];
    },
    enabled: !!linkedStudentId,
  });

  const monthStats = useMemo(() => {
    const hadir = monthAttendance.filter((a: any) => a.status === "hadir").length;
    const terlambat = monthAttendance.filter((a: any) => a.status === "terlambat").length;
    const izin = monthAttendance.filter((a: any) => a.status === "izin").length;
    const sakit = monthAttendance.filter((a: any) => a.status === "sakit").length;
    const tidakHadir = monthAttendance.filter((a: any) => a.status === "tidak-hadir").length;
    const total = monthAttendance.length;
    const percent = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;
    return { hadir, terlambat, izin, sakit, tidakHadir, total, percent };
  }, [monthAttendance]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(chart14Start), end: new Date() });
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const rec = chartAttendance.find((a: any) => a.date === dateStr);
      return {
        date: format(day, "dd/MM"),
        hadir: rec?.status === "hadir" ? 1 : 0,
        terlambat: rec?.status === "terlambat" ? 1 : 0,
      };
    });
  }, [chartAttendance, chart14Start]);

  // Countdown to attendance end
  const countdownInfo = useMemo(() => {
    if (!attendanceSettings) return null;
    const now = new Date();
    const [endH, endM] = (attendanceSettings.attendanceEnd || "08:00").split(":").map(Number);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
  }, [attendanceSettings]);

  const statusInfo = useMemo(() => {
    if (!todayRecord) return { label: "Belum Presensi", color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: AlertCircle };
    if (todayRecord.status === "hadir") return { label: "Hadir", color: "text-success", bg: "bg-success/10 border-success/30", icon: CheckCircle2 };
    if (todayRecord.status === "terlambat") return { label: "Terlambat", color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: Clock };
    if (todayRecord.status === "izin") return { label: "Izin", color: "text-primary", bg: "bg-primary/10 border-primary/30", icon: AlertCircle };
    if (todayRecord.status === "sakit") return { label: "Sakit", color: "text-primary", bg: "bg-primary/10 border-primary/30", icon: AlertCircle };
    return { label: "Tidak Hadir", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: AlertCircle };
  }, [todayRecord]);

  if (!linkedStudentId) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Holiday Banner */}
      <HolidayBanner compact />

      {/* Date */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        <span className="text-sm font-medium">{todayDisplay}</span>
      </div>

      {/* Today status */}
      <Card className={`border ${statusInfo.bg}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusInfo.bg}`}>
              <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Status Presensi Hari Ini</p>
              <p className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
              {todayRecord?.time && (
                <p className="text-sm text-muted-foreground font-mono mt-0.5">Jam masuk: {todayRecord.time.slice(0, 5)}</p>
              )}
              {!todayRecord && countdownInfo && (
                <p className="text-xs text-muted-foreground mt-1">Batas presensi: <span className="font-semibold text-warning">{countdownInfo} lagi</span></p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick action */}
      {!todayRecord && !isTodayOff && (
        <Link to="/student/presensi">
          <Card className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.99]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScanFace className="w-6 h-6" />
                <div>
                  <p className="font-semibold text-sm">Mulai Presensi Sekarang</p>
                  <p className="text-xs opacity-75">Scan wajah untuk presensi hari ini</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Monthly summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Kehadiran Bulan {format(new Date(), "MMMM yyyy", { locale: localeId })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <p className="text-xl font-bold text-success">{monthStats.hadir}</p>
              <p className="text-xs text-muted-foreground">Hadir</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <p className="text-xl font-bold text-warning">{monthStats.terlambat}</p>
              <p className="text-xs text-muted-foreground">Terlambat</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xl font-bold text-primary">{monthStats.izin}</p>
              <p className="text-xs text-muted-foreground">Izin</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xl font-bold text-primary">{monthStats.sakit}</p>
              <p className="text-xs text-muted-foreground">Sakit</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-xl font-bold text-destructive">{monthStats.tidakHadir}</p>
              <p className="text-xs text-muted-foreground">Tidak Hadir</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tingkat Kehadiran</span>
              <span className={`font-semibold ${monthStats.percent >= 75 ? "text-success" : "text-warning"}`}>{monthStats.percent}%</span>
            </div>
            <Progress value={monthStats.percent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Grafik 14 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="hadir" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#studentGrad)" name="Hadir" />
              <Area type="monotone" dataKey="terlambat" stroke="hsl(var(--warning))" strokeWidth={2} fill="transparent" name="Terlambat" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Jam presensi info */}
      {attendanceSettings && !isTodayOff && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Jadwal Presensi</p>
            <div className="flex gap-6 text-sm">
              <div><span className="text-muted-foreground text-xs">Buka</span><p className="font-semibold">{attendanceSettings.attendanceStart}</p></div>
              <div><span className="text-muted-foreground text-xs">Terlambat setelah</span><p className="font-semibold text-warning">{attendanceSettings.lateThreshold}</p></div>
              <div><span className="text-muted-foreground text-xs">Tutup</span><p className="font-semibold text-destructive">{attendanceSettings.attendanceEnd}</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
