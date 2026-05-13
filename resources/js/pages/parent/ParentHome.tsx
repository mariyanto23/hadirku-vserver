import { useMemo, useEffect } from "react";
import { SignedImage } from "@/components/SignedImage";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, CalendarDays,
  TrendingUp, Bell, User, Loader2, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAttendanceSettings } from "@/hooks/useSettings";
import { HolidayBanner } from "@/components/HolidayBanner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { eachDayOfInterval, subDays, parseISO } from "date-fns";

export default function ParentHome() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: attendanceSettings } = useAttendanceSettings();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId });
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const chart30Start = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("parent_student_links")
        .select("student_id, students(id, name, nis, photo_url, classes(name))")
        .eq("parent_user_id", user.id);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.students.id,
        name: d.students.name,
        nis: d.students.nis,
        photo_url: d.students.photo_url,
        class_name: d.students.classes?.name || "-",
      }));
    },
    enabled: !!user,
  });

  const childIds = children.map((c: any) => c.id);

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["parent-today-attendance", childIds, today],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .in("student_id", childIds)
        .eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: childIds.length > 0,
  });

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ["parent-month-attendance", childIds, monthStart],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .in("student_id", childIds)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: childIds.length > 0,
  });

  const { data: chartAttendance = [] } = useQuery({
    queryKey: ["parent-chart-attendance", childIds, chart30Start],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("date, status")
        .in("student_id", childIds)
        .gte("date", chart30Start)
        .lte("date", today)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: childIds.length > 0,
  });

  // Realtime
  useEffect(() => {
    if (childIds.length === 0) return;
    const channel = supabase
      .channel("parent-home-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_records" }, (payload) => {
        const record = payload.new as any;
        if (childIds.includes(record.student_id)) {
          const child = children.find((c: any) => c.id === record.student_id);
          const childName = child?.name || "Anak Anda";
          const statusLabel = record.status === "hadir" ? "Hadir" : record.status === "terlambat" ? "Terlambat" : record.status === "izin" ? "Izin" : record.status === "sakit" ? "Sakit" : "Tidak Hadir";
          const timeStr = record.time?.slice(0, 5) || "";
          toast.info(`${childName} telah presensi: ${statusLabel} pukul ${timeStr}`, {
            icon: <Bell className="w-4 h-4" />,
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["parent-today-attendance"] });
          queryClient.invalidateQueries({ queryKey: ["parent-month-attendance"] });
          queryClient.invalidateQueries({ queryKey: ["parent-chart-attendance"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [childIds.join(","), children]);

  // Today status per child
  const childTodayStatus = useMemo(() => {
    return children.map((child: any) => {
      const rec = todayAttendance.find((a: any) => a.student_id === child.id);
      return { ...child, todayRecord: rec || null };
    });
  }, [children, todayAttendance]);

  // Month stats (aggregate)
  const monthStats = useMemo(() => {
    const hadir = monthAttendance.filter((a: any) => a.status === "hadir").length;
    const terlambat = monthAttendance.filter((a: any) => a.status === "terlambat").length;
    const izin = monthAttendance.filter((a: any) => a.status === "izin").length;
    const sakit = monthAttendance.filter((a: any) => a.status === "sakit").length;
    const total = monthAttendance.length;
    const daysInMonth = getDaysInMonth(new Date());
    const schoolDaysSetting = attendanceSettings?.schoolDays ?? 6;
    const schoolDaysPassed = Math.min(
      eachDayOfInterval({ start: startOfMonth(new Date()), end: new Date() })
        .filter(d => {
          const day = d.getDay();
          if (day === 0) return false; // Sunday always off
          if (schoolDaysSetting === 5 && day === 6) return false; // Saturday off for 5-day
          return true;
        }).length,
      daysInMonth
    );
    return { hadir, terlambat, izin, sakit, total, schoolDaysPassed, absen: Math.max(0, schoolDaysPassed * children.length - total) };
  }, [monthAttendance, children]);

  // Chart data
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(chart30Start), end: new Date() });
    return days.slice(-14).map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayRecs = chartAttendance.filter((a: any) => a.date === dateStr);
      return {
        date: format(day, "dd/MM"),
        hadir: dayRecs.filter((a: any) => a.status === "hadir").length,
        terlambat: dayRecs.filter((a: any) => a.status === "terlambat").length,
      };
    });
  }, [chartAttendance, chart30Start]);

  const attendancePercent = useMemo(() => {
    if (monthStats.schoolDaysPassed === 0 || children.length === 0) return 0;
    return Math.round(((monthStats.hadir + monthStats.terlambat) / (monthStats.schoolDaysPassed * children.length)) * 100);
  }, [monthStats, children]);

  const getStatusInfo = (record: any | null) => {
    if (!record) return { label: "Belum Presensi", color: "text-muted-foreground", bg: "bg-muted/50", icon: AlertCircle, iconColor: "text-muted-foreground" };
    if (record.status === "hadir") return { label: "Hadir", color: "text-success", bg: "bg-success/10", icon: CheckCircle2, iconColor: "text-success" };
    if (record.status === "terlambat") return { label: "Terlambat", color: "text-warning", bg: "bg-warning/10", icon: Clock, iconColor: "text-warning" };
    if (record.status === "izin") return { label: "Izin", color: "text-primary", bg: "bg-primary/10", icon: AlertCircle, iconColor: "text-primary" };
    if (record.status === "sakit") return { label: "Sakit", color: "text-primary", bg: "bg-primary/10", icon: AlertCircle, iconColor: "text-primary" };
    return { label: "Tidak Hadir", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle, iconColor: "text-destructive" };
  };

  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Date + realtime indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          <span className="text-sm font-medium">{todayDisplay}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-success">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </div>
      </div>

      {/* Holiday Banner */}
      <HolidayBanner />

      {/* No children state */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada anak terhubung</p>
            <p className="text-sm mt-1">Hubungi admin sekolah untuk menghubungkan akun.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Today status cards */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Status Hari Ini</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {childTodayStatus.map((child: any) => {
                const statusInfo = getStatusInfo(child.todayRecord);
                const Icon = statusInfo.icon;
                return (
                  <Card key={child.id} className={`border ${statusInfo.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {child.photo_url
                            ? <SignedImage storageSrc={child.photo_url} alt={child.name} className="w-full h-full object-cover" fallback={<User className="w-5 h-5 text-muted-foreground" />} />
                            : <User className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{child.name}</p>
                          <p className="text-xs text-muted-foreground">{child.class_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                            <Icon className={`w-4 h-4 ${statusInfo.iconColor}`} />
                            <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                          {child.todayRecord?.time && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {child.todayRecord.time.slice(0, 5)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Monthly summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Kehadiran Bulan {format(new Date(), "MMMM yyyy", { locale: localeId })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-xl font-bold text-success">{monthStats.hadir}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Hadir</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-xl font-bold text-warning">{monthStats.terlambat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Terlambat</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10">
                  <p className="text-xl font-bold text-primary">{monthStats.izin}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Izin</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10">
                  <p className="text-xl font-bold text-primary">{monthStats.sakit}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sakit</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-xl font-bold text-destructive">{monthStats.absen}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tidak Hadir</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tingkat Kehadiran</span>
                  <span className={`font-semibold ${attendancePercent >= 75 ? "text-success" : attendancePercent >= 50 ? "text-warning" : "text-destructive"}`}>
                    {attendancePercent}%
                  </span>
                </div>
                <Progress value={attendancePercent} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Mini trend chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Tren 14 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hadirGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="hadir" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hadirGrad)" name="Hadir" />
                  <Area type="monotone" dataKey="terlambat" stroke="hsl(var(--warning))" strokeWidth={2} fill="transparent" name="Terlambat" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick link to Anak */}
          <Link to="/parent/anak">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.99]">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Lihat Detail Anak</p>
                  <p className="text-xs text-muted-foreground">Profil, riwayat, dan statistik lengkap</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </>
      )}
    </div>
  );
}
