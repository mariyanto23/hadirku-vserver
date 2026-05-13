import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  FileText, CheckCircle, Clock, XCircle, CalendarDays, Download, Loader2, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function ParentReports() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

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
        class_name: d.students.classes?.name || "-",
      }));
    },
    enabled: !!user,
  });

  const effectiveChild = selectedChildId || children[0]?.id || "";
  const selectedChildData = children.find((c: any) => c.id === effectiveChild);

  const monthStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["parent-report-attendance", effectiveChild, monthStart, monthEnd],
    queryFn: async () => {
      if (!effectiveChild) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", effectiveChild)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveChild,
  });

  const stats = useMemo(() => {
    const hadir = attendance.filter((a: any) => a.status === "hadir").length;
    const terlambat = attendance.filter((a: any) => a.status === "terlambat").length;
    const total = attendance.length;
    const percent = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;
    return { hadir, terlambat, total, percent, absen: total - hadir - terlambat };
  }, [attendance]);

  // Chart data by week
  const chartData = useMemo(() => {
    const weeks: { week: string; hadir: number; terlambat: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const weekLabel = `Minggu ${i + 1}`;
      const weekRecs = attendance.filter((a: any) => {
        const day = new Date(a.date).getDate();
        return day >= i * 7 + 1 && day <= (i + 1) * 7;
      });
      if (weekRecs.length > 0 || i < 4) {
        weeks.push({
          week: weekLabel,
          hadir: weekRecs.filter((a: any) => a.status === "hadir").length,
          terlambat: weekRecs.filter((a: any) => a.status === "terlambat").length,
        });
      }
    }
    return weeks;
  }, [attendance]);

  const absentDays = useMemo(() => attendance.filter((a: any) => a.status === "tidak_hadir"), [attendance]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: localeId }) };
    });
  }, []);

  const handleDownloadCSV = () => {
    if (attendance.length === 0) { toast.error("Tidak ada data untuk diunduh"); return; }
    const headers = ["Tanggal", "Hari", "Jam", "Status"];
    const rows = attendance.map((a: any) => [
      a.date,
      format(new Date(a.date), "EEEE", { locale: localeId }),
      a.time?.slice(0, 5) || "-",
      a.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${selectedChildData?.name || "anak"}-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Laporan berhasil diunduh");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir": return <Badge className="bg-success/10 text-success border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Hadir</Badge>;
      case "terlambat": return <Badge className="bg-warning/10 text-warning border-0 gap-1 text-xs"><Clock className="w-3 h-3" />Terlambat</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0 gap-1 text-xs"><XCircle className="w-3 h-3" />Tidak Hadir</Badge>;
    }
  };

  if (loadingChildren) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {children.length > 1 && (
          <Select value={effectiveChild} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih anak" /></SelectTrigger>
            <SelectContent>
              {children.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={handleDownloadCSV}>
          <Download className="w-4 h-4" /> Unduh CSV
        </Button>
      </div>

      {/* Header */}
      {selectedChildData && (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{selectedChildData.name} – {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: localeId })}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{stats.hadir}</p>
          <p className="text-xs text-muted-foreground">Hadir</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-warning">{stats.terlambat}</p>
          <p className="text-xs text-muted-foreground">Terlambat</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.absen}</p>
          <p className="text-xs text-muted-foreground">Tidak Hadir</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className={`text-2xl font-bold ${stats.percent >= 75 ? "text-success" : "text-warning"}`}>{stats.percent}%</p>
          <p className="text-xs text-muted-foreground">Kehadiran</p>
        </CardContent></Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tingkat Kehadiran Bulan Ini</span>
            <span className={`font-bold ${stats.percent >= 75 ? "text-success" : "text-warning"}`}>{stats.percent}%</span>
          </div>
          <Progress value={stats.percent} className="h-3" />
          {stats.percent < 75 && (
            <p className="text-xs text-warning flex items-center gap-1"><XCircle className="w-3 h-3" />Kehadiran di bawah batas minimum 75%</p>
          )}
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Tren Per Minggu</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAtt ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="hadir" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hadir" />
                <Bar dataKey="terlambat" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Terlambat" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Attendance table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />Daftar Hari Tidak Hadir ({absentDays.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {absentDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 text-success">Tidak ada hari tidak hadir bulan ini 🎉</p>
          ) : (
            <div className="space-y-2">
              {absentDays.map((rec: any) => (
                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <span className="text-sm">{format(new Date(rec.date), "EEEE, d MMMM yyyy", { locale: localeId })}</span>
                  {getStatusBadge(rec.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full history table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Rekap Lengkap</CardTitle></CardHeader>
        <CardContent>
          {loadingAtt ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada data presensi bulan ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...attendance].reverse().map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">{format(new Date(record.date), "d MMM", { locale: localeId })}</TableCell>
                      <TableCell className="text-sm">{format(new Date(record.date), "EEEE", { locale: localeId })}</TableCell>
                      <TableCell className="text-sm font-mono">{record.time?.slice(0, 5) || "-"}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
