import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, subDays, startOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DayContentProps } from "react-day-picker";
import { 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Trophy,
  AlertTriangle,
  CalendarRange,
  Pencil,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AttendanceTrendChart } from "@/components/AttendanceTrendChart";
import { cn } from "@/lib/utils";
import { useAttendanceByDate } from "@/hooks/useAttendance";
import { useStudents, useClasses } from "@/hooks/useStudents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendanceByDateRange } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { HolidayBanner } from "@/components/HolidayBanner";
import { useHolidays } from "@/hooks/useHolidays";
import { useAttendanceSettings } from "@/hooks/useSettings";

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Semua Status");
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Read status filter from URL params on mount
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setSelectedStatus(statusParam);
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useAttendanceByDate(dateStr);
  const { data: students = [] } = useStudents();
  const { data: classes = [] } = useClasses();
  const { data: holidays = [] } = useHolidays();

  const { data: attendanceSettings } = useAttendanceSettings();
  const schoolDays = attendanceSettings?.schoolDays ?? 6;

  // Build holiday name map for tooltips
  const holidayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => map.set(h.date, h.name));
    return map;
  }, [holidays]);

  // Build holiday dates for calendar modifiers
  const holidayDates = useMemo(() => {
    return holidays.map(h => new Date(h.date + "T00:00:00"));
  }, [holidays]);

  // Build weekend dates for visible months (current ± 2 months)
  const weekendDates = useMemo(() => {
    const dates: Date[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || (schoolDays === 5 && day === 6)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [schoolDays]);

  const holidayModifiers = { holiday: holidayDates, weekend: weekendDates };
  const holidayModifiersStyles = {
    holiday: {
      backgroundColor: "hsl(var(--warning) / 0.2)",
      color: "hsl(var(--warning))",
      fontWeight: 700,
      borderRadius: "9999px",
    } as React.CSSProperties,
    weekend: {
      backgroundColor: "hsl(var(--muted))",
      color: "hsl(var(--muted-foreground))",
      fontWeight: 600,
      borderRadius: "9999px",
      opacity: 0.7,
    } as React.CSSProperties,
  };

  // Custom DayContent with tooltip for holidays/weekends
  const DayWithTooltip = useCallback((props: DayContentProps) => {
    const dateStr = format(props.date, "yyyy-MM-dd");
    const dayOfWeek = props.date.getDay();
    const holidayName = holidayNameMap.get(dateStr);
    const isWeekendDay = dayOfWeek === 0 || (schoolDays === 5 && dayOfWeek === 6);
    
    let tooltip = "";
    if (holidayName) {
      tooltip = holidayName;
    } else if (isWeekendDay) {
      tooltip = dayOfWeek === 0 ? "Hari Minggu" : "Hari Sabtu";
    }

    return (
      <span title={tooltip || undefined}>
        {props.date.getDate()}
      </span>
    );
  }, [holidayNameMap, schoolDays]);

  const calendarComponents = useMemo(() => ({
    DayContent: DayWithTooltip,
  }), [DayWithTooltip]);

  const handleStatusChange = useCallback(async (studentId: string, newStatus: "hadir" | "terlambat" | "izin" | "sakit" | "tidak-hadir") => {
    const date = format(selectedDate, "yyyy-MM-dd");
    const existingRecord = attendanceRecords.find(r => r.student_id === studentId);
    
    try {
      if (newStatus === "tidak-hadir" && existingRecord) {
        // Delete attendance record to mark as absent
        const { error } = await supabase
          .from("attendance_records")
          .delete()
          .eq("student_id", studentId)
          .eq("date", date);
        if (error) throw error;
      } else if (existingRecord) {
        // Update existing record - set time to 06:30 if changing to hadir
        const updateData: { status: string; time?: string } = { status: newStatus };
        if (newStatus === "hadir") {
          updateData.time = "06:30:00";
        }
        const { error } = await supabase
          .from("attendance_records")
          .update(updateData)
          .eq("student_id", studentId)
          .eq("date", date);
        if (error) throw error;
      } else {
        // Insert new record - use 06:30 for hadir, current time for others
        const time = newStatus === "hadir" ? "06:30:00" : new Date().toTimeString().split(" ")[0];
        const { error } = await supabase
          .from("attendance_records")
          .insert({ student_id: studentId, date, time, status: newStatus });
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ["attendance", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["attendance-range"] });
      toast.success("Status kehadiran berhasil diubah");
    } catch (error: any) {
      toast.error("Gagal mengubah status: " + error.message);
    }
    setEditingId(null);
  }, [selectedDate, attendanceRecords, dateStr, queryClient]);

  // Get attendance for custom date range for ranking
  const rangeFrom = format(dateFrom, "yyyy-MM-dd");
  const rangeTo = format(dateTo, "yyyy-MM-dd");
  const { data: rangeAttendance = [] } = useQuery({
    queryKey: ["attendance-range", rangeFrom, rangeTo],
    queryFn: () => getAttendanceByDateRange(rangeFrom, rangeTo),
  });

  // Build class options from real data
  const classOptions = useMemo(() => {
    const uniqueClasses = ["Semua Kelas", ...classes.map(c => c.name)];
    return uniqueClasses;
  }, [classes]);

  // Merge students with attendance for the selected date
  const mergedRecords = useMemo(() => {
    return students.map(student => {
      const attendance = attendanceRecords.find(a => a.student_id === student.id);
      return {
        id: student.id,
        nis: student.nis,
        name: student.name,
        class: student.class_name || "-",
        class_id: student.class_id,
        time: attendance?.time || "-",
        status: attendance?.status || "tidak-hadir" as const,
      };
    });
  }, [students, attendanceRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return mergedRecords.filter(record => {
      const matchClass = selectedClass === "Semua Kelas" || record.class === selectedClass;
      const matchSearch = record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.nis.includes(searchQuery);
      const matchStatus = selectedStatus === "Semua Status" || record.status === selectedStatus;
      return matchClass && matchSearch && matchStatus;
    });
  }, [mergedRecords, selectedClass, searchQuery, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: filteredRecords.length,
    hadir: filteredRecords.filter(r => r.status === "hadir").length,
    terlambat: filteredRecords.filter(r => r.status === "terlambat").length,
    izin: filteredRecords.filter(r => r.status === "izin").length,
    sakit: filteredRecords.filter(r => r.status === "sakit").length,
    tidakHadir: filteredRecords.filter(r => r.status === "tidak-hadir").length,
  }), [filteredRecords]);

  // Calculate top 3 most diligent and most absent students
  const { topDiligent, topAbsent, activeDays } = useMemo(() => {
    const uniqueDates = new Set(rangeAttendance.map(r => r.date));
    const activeDays = uniqueDates.size;

    const studentStats = new Map<string, { 
      id: string; name: string; class: string;
      hadir: number; terlambat: number; total: number;
    }>();

    students.forEach(student => {
      studentStats.set(student.id, {
        id: student.id, name: student.name,
        class: student.class_name || "-",
        hadir: 0, terlambat: 0, total: 0,
      });
    });

    rangeAttendance.forEach(record => {
      const stats = studentStats.get(record.student_id);
      if (stats) {
        stats.total++;
        if (record.status === "hadir") stats.hadir++;
        else if (record.status === "terlambat") stats.terlambat++;
      }
    });

    const allStats = Array.from(studentStats.values());

    const topDiligent = [...allStats]
      .sort((a, b) => (b.hadir + b.terlambat) - (a.hadir + a.terlambat))
      .slice(0, 3);

    const topAbsent = [...allStats]
      .map(s => ({ ...s, absentDays: Math.max(0, activeDays - s.hadir - s.terlambat) }))
      .filter(s => s.absentDays > 0)
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 3);

    return { topDiligent, topAbsent, activeDays };
  }, [students, rangeAttendance]);

  const getActivePreset = () => {
    const now = new Date();
    const fromStr = format(dateFrom, "yyyy-MM-dd");
    const toStr = format(dateTo, "yyyy-MM-dd");
    const todayStr = format(now, "yyyy-MM-dd");
    if (toStr !== todayStr) return "custom";
    if (fromStr === format(subDays(now, 6), "yyyy-MM-dd")) return "7";
    if (fromStr === format(subDays(now, 13), "yyyy-MM-dd")) return "14";
    if (fromStr === format(subDays(now, 29), "yyyy-MM-dd")) return "30";
    if (fromStr === format(startOfMonth(now), "yyyy-MM-dd")) return "month";
    return "custom";
  };

  const handleExport = async (type: "excel" | "pdf" | "csv") => {
    const statusMap: Record<string, string> = { hadir: "Hadir", terlambat: "Terlambat", izin: "Izin", sakit: "Sakit", "tidak-hadir": "Tidak Hadir" };
    const dateLabel = format(selectedDate, "yyyy-MM-dd");
    const rows = filteredRecords.map((r, i) => ({
      No: i + 1,
      NIS: r.nis,
      "Nama Siswa": r.name,
      Kelas: r.class,
      "Jam Masuk": r.time,
      Status: statusMap[r.status] || r.status,
    }));

    if (type === "csv") {
      const headers = Object.keys(rows[0] || {});
      const csvContent = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kehadiran_${dateLabel}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File CSV berhasil diunduh");
    } else if (type === "excel") {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Kehadiran");
      ws.columns = Object.keys(rows[0] || {}).map(key => ({ header: key, key }));
      rows.forEach(r => ws.addRow(r));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kehadiran_${dateLabel}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File Excel berhasil diunduh");
    } else if (type === "pdf") {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Rekap Kehadiran - ${format(selectedDate, "d MMMM yyyy", { locale: localeId })}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Kelas: ${selectedClass} | Status: ${selectedStatus}`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [["No", "NIS", "Nama Siswa", "Kelas", "Jam Masuk", "Status"]],
        body: rows.map(r => [r.No, r.NIS, r["Nama Siswa"], r.Kelas, r["Jam Masuk"], r.Status]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save(`kehadiran_${dateLabel}.pdf`);
      toast.success("File PDF berhasil diunduh");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <CheckCircle className="w-3.5 h-3.5" />
            Hadir
          </span>
        );
      case "terlambat":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
            <Clock className="w-3.5 h-3.5" />
            Terlambat
          </span>
        );
      case "izin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            <FileText className="w-3.5 h-3.5" />
            Izin
          </span>
        );
      case "sakit":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            <FileText className="w-3.5 h-3.5" />
            Sakit
          </span>
        );
      case "tidak-hadir":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <XCircle className="w-3.5 h-3.5" />
            Tidak Hadir
          </span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    const colors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
    return (
      <span className={cn("font-bold text-lg", colors[rank - 1] || "text-muted-foreground")}>
        #{rank}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rekap Presensi</h1>
        <p className="text-sm text-muted-foreground">Lihat dan unduh laporan kehadiran</p>
      </div>

      {/* Holiday indicator for selected date */}
      <HolidayBanner date={dateStr} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Siswa</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Hadir</p>
          <p className="text-2xl font-bold text-success">{stats.hadir}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Terlambat</p>
          <p className="text-2xl font-bold text-warning">{stats.terlambat}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Izin</p>
          <p className="text-2xl font-bold text-primary">{stats.izin}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Sakit</p>
          <p className="text-2xl font-bold text-primary">{stats.sakit}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tidak Hadir</p>
          <p className="text-2xl font-bold text-destructive">{stats.tidakHadir}</p>
        </div>
      </div>

      {/* Tren Kehadiran + Date Range Filter in one card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tren Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <CalendarRange className="w-4 h-4 text-muted-foreground" />
            <Select
              value={getActivePreset()}
              onValueChange={(v) => {
                const now = new Date();
                if (v === "7") { setDateFrom(subDays(now, 6)); setDateTo(now); }
                else if (v === "14") { setDateFrom(subDays(now, 13)); setDateTo(now); }
                else if (v === "30") { setDateFrom(subDays(now, 29)); setDateTo(now); }
                else if (v === "month") { setDateFrom(startOfMonth(now)); setDateTo(now); }
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Pilih rentang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Hari Terakhir</SelectItem>
                <SelectItem value="14">14 Hari Terakhir</SelectItem>
                <SelectItem value="30">30 Hari Terakhir</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(dateFrom, "d MMM yyyy", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  initialFocus
                  disabled={(date) => date > dateTo}
                  modifiers={holidayModifiers}
                  modifiersStyles={holidayModifiersStyles}
                  components={calendarComponents}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-sm text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(dateTo, "d MMM yyyy", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  initialFocus
                  disabled={(date) => date < dateFrom || date > new Date()}
                  modifiers={holidayModifiers}
                  modifiersStyles={holidayModifiersStyles}
                  components={calendarComponents}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">({activeDays} hari aktif)</span>
          </div>
          {/* Chart inline */}
          <AttendanceTrendChart dateFrom={dateFrom} dateTo={dateTo} embedded />
        </CardContent>
      </Card>

      {/* Top Performers Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Most Diligent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Siswa Paling Rajin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDiligent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              topDiligent.map((student, idx) => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  {getRankBadge(idx + 1)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-success">{student.hadir + student.terlambat} hari</p>
                    <p className="text-xs text-muted-foreground">kehadiran</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Most Absent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Sering Tidak Hadir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAbsent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              topAbsent.map((student, idx) => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  {getRankBadge(idx + 1)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">{student.absentDays} hari</p>
                    <p className="text-xs text-muted-foreground">tidak hadir</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Kehadiran - Combined Card */}
      <div className="bg-card rounded-xl border border-border">
        {/* Header: Title + Date + Export */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground">Data Kehadiran</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(selectedDate, "d MMMM yyyy", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  modifiers={holidayModifiers}
                  modifiersStyles={holidayModifiersStyles}
                  components={calendarComponents}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
                <FileText className="w-4 h-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2">
                <FileText className="w-4 h-4" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status">Semua Status</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="terlambat">Terlambat</SelectItem>
                <SelectItem value="izin">Izin</SelectItem>
                <SelectItem value="sakit">Sakit</SelectItem>
                <SelectItem value="tidak-hadir">Tidak Hadir</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAttendance ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Tidak ada data siswa
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, idx) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{record.nis}</TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.class}</TableCell>
                    <TableCell className="font-mono">{record.time}</TableCell>
                    <TableCell>
                      {editingId === record.id ? (
                        <Select
                          value={record.status}
                          onValueChange={(v) => handleStatusChange(record.id, v as "hadir" | "terlambat" | "izin" | "sakit" | "tidak-hadir")}
                          open={true}
                          onOpenChange={(open) => { if (!open) setEditingId(null); }}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hadir">Hadir</SelectItem>
                            <SelectItem value="terlambat">Terlambat</SelectItem>
                            <SelectItem value="izin">Izin</SelectItem>
                            <SelectItem value="sakit">Sakit</SelectItem>
                            <SelectItem value="tidak-hadir">Tidak Hadir</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(record.status)
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setEditingId(record.id)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit status"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
