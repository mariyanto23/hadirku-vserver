import { useState, useMemo } from "react";
import { SignedImage } from "@/components/SignedImage";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  User, CheckCircle, Clock, XCircle, CalendarRange, Loader2, BarChart3, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function ParentChildren() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [dateRange, setDateRange] = useState("30");

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

  // Auto-select first child
  const effectiveChild = selectedChildId || children[0]?.id || "";

  const dateFrom = useMemo(() => format(subDays(new Date(), parseInt(dateRange) - 1), "yyyy-MM-dd"), [dateRange]);
  const dateTo = format(new Date(), "yyyy-MM-dd");

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["parent-child-attendance", effectiveChild, dateFrom, dateTo],
    queryFn: async () => {
      if (!effectiveChild) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", effectiveChild)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });
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

  const lateRecords = useMemo(() => attendance.filter((a: any) => a.status === "terlambat"), [attendance]);

  const selectedChild = children.find((c: any) => c.id === effectiveChild);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir": return <Badge className="bg-success/10 text-success border-0 gap-1"><CheckCircle className="w-3 h-3" />Hadir</Badge>;
      case "terlambat": return <Badge className="bg-warning/10 text-warning border-0 gap-1"><Clock className="w-3 h-3" />Terlambat</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0 gap-1"><XCircle className="w-3 h-3" />Tidak Hadir</Badge>;
    }
  };

  if (loadingChildren) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (children.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada anak terhubung</p>
            <p className="text-sm mt-1">Hubungi admin sekolah untuk menghubungkan akun.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Child selector */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Daftar Anak</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map((child: any) => (
            <Card
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`cursor-pointer transition-all ${effectiveChild === child.id ? "border-primary ring-1 ring-primary/50" : "hover:border-primary/40"}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {child.photo_url
                    ? <SignedImage storageSrc={child.photo_url} alt={child.name} className="w-full h-full object-cover" fallback={<User className="w-6 h-6 text-primary" />} />
                    : <User className="w-6 h-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{child.name}</p>
                  <p className="text-xs text-muted-foreground">Kelas {child.class_name}</p>
                  <p className="text-xs text-muted-foreground">NIS: {child.nis}</p>
                </div>
                {effectiveChild === child.id && <Badge variant="default" className="flex-shrink-0 text-xs">Dipilih</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats for selected child */}
      {selectedChild && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarRange className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Hari Terakhir</SelectItem>
                <SelectItem value="14">14 Hari Terakhir</SelectItem>
                <SelectItem value="30">30 Hari Terakhir</SelectItem>
                <SelectItem value="90">3 Bulan Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Statistik {selectedChild.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-xl font-bold text-success">{stats.hadir}</p>
                  <p className="text-xs text-muted-foreground">Hadir</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-xl font-bold text-warning">{stats.terlambat}</p>
                  <p className="text-xs text-muted-foreground">Terlambat</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-xl font-bold text-destructive">{stats.absen}</p>
                  <p className="text-xs text-muted-foreground">Tidak Hadir</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Kehadiran</span>
                  <span className={`font-semibold ${stats.percent >= 75 ? "text-success" : "text-warning"}`}>{stats.percent}%</span>
                </div>
                <Progress value={stats.percent} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Late notes */}
          {lateRecords.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-4 h-4" />Catatan Keterlambatan ({lateRecords.length}x)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lateRecords.slice(0, 5).map((rec: any) => (
                    <div key={rec.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{format(new Date(rec.date), "EEEE, d MMM yyyy", { locale: localeId })}</span>
                      <span className="font-mono text-warning text-xs">{rec.time?.slice(0, 5)}</span>
                    </div>
                  ))}
                  {lateRecords.length > 5 && <p className="text-xs text-muted-foreground">+{lateRecords.length - 5} lainnya...</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Riwayat Presensi</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAtt ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada data presensi pada periode ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jam</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">{format(new Date(record.date), "d MMM yyyy", { locale: localeId })}</TableCell>
                          <TableCell className="text-sm font-mono">{record.time?.slice(0, 5)}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
