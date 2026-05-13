import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarRange, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function StudentHistory() {
  const { linkedStudentId } = useRole();
  const [dateRange, setDateRange] = useState("30");

  const dateFrom = useMemo(() => format(subDays(new Date(), parseInt(dateRange) - 1), "yyyy-MM-dd"), [dateRange]);
  const dateTo = format(new Date(), "yyyy-MM-dd");

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["student-attendance", linkedStudentId, dateFrom, dateTo],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", linkedStudentId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!linkedStudentId,
  });

  const stats = useMemo(() => {
    const hadir = attendance.filter((a: any) => a.status === "hadir").length;
    const terlambat = attendance.filter((a: any) => a.status === "terlambat").length;
    return { total: attendance.length, hadir, terlambat };
  }, [attendance]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir": return <Badge className="bg-success/10 text-success border-0 gap-1"><CheckCircle className="w-3 h-3" />Hadir</Badge>;
      case "terlambat": return <Badge className="bg-warning/10 text-warning border-0 gap-1"><Clock className="w-3 h-3" />Terlambat</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0 gap-1"><XCircle className="w-3 h-3" />Tidak Hadir</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
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

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{stats.hadir}</p><p className="text-xs text-muted-foreground">Hadir</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{stats.terlambat}</p><p className="text-xs text-muted-foreground">Terlambat</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data presensi.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
