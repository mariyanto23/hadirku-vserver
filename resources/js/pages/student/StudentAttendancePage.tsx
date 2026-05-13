import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ScanFace, CheckCircle, Clock, XCircle, Camera, CalendarDays, Loader2, FileText, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FaceCamera } from "@/components/FaceCamera";
import { FaceRegistrationDialog } from "@/components/FaceRegistrationDialog";
import { loadRegisteredFaces, findMatchingFace } from "@/services/faceRecognition";
import { useAttendanceSettings } from "@/hooks/useSettings";
import { playSuccessSound, playErrorSound, playAlreadySound, playScanStartSound } from "@/lib/audio";
import { HolidayBanner, useIsTodayOff } from "@/components/HolidayBanner";

export default function StudentAttendancePage() {
  const { linkedStudentId } = useRole();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState<string | null>(null);
  const [showFaceReg, setShowFaceReg] = useState(false);
  const { data: attendanceSettings } = useAttendanceSettings();
  const todayHoliday = useIsTodayOff();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId });

  // Leave request form state
  const [leaveType, setLeaveType] = useState<"izin" | "sakit">("izin");
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

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

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["student-today-list", linkedStudentId, today],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", linkedStudentId)
        .eq("date", today)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!linkedStudentId,
    refetchInterval: 15000,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["student-leave-requests", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("student_id", linkedStudentId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!linkedStudentId,
  });

  useEffect(() => { loadRegisteredFaces(); }, []);

  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    if (!linkedStudentId || !attendanceSettings || todayHoliday) return;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = attendanceSettings.attendanceStart || "06:30";
    const end = attendanceSettings.attendanceEnd || "08:00";

    if (currentTimeStr < start) {
      playErrorSound();
      toast.error(`Presensi belum dibuka. Jam mulai: ${start}`);
      setIsScanning(false);
      return;
    }
    if (currentTimeStr > end) {
      playErrorSound();
      toast.error(`Presensi sudah ditutup. Jam selesai: ${end}`);
      setIsScanning(false);
      return;
    }

    const match = findMatchingFace(descriptor);
    if (!match || match.studentId !== linkedStudentId) {
      playErrorSound();
      toast.error("Wajah tidak cocok dengan data Anda");
      setAttendanceResult("not-match");
      return;
    }

    const todayDate = now.toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", linkedStudentId)
      .eq("date", todayDate)
      .maybeSingle();

    if (existing) {
      playAlreadySound();
      toast.info("Anda sudah presensi hari ini");
      setAttendanceResult("already");
      setIsScanning(false);
      return;
    }

    const timeStr = now.toTimeString().split(" ")[0];
    const lateThreshold = attendanceSettings.lateThreshold || "07:00";
    const isLate = currentTimeStr > lateThreshold;

    const { error } = await supabase.from("attendance_records").insert({
      student_id: linkedStudentId,
      date: todayDate,
      time: timeStr,
      status: isLate ? "terlambat" : "hadir",
    });

    if (error) {
      playErrorSound();
      toast.error("Gagal mencatat presensi");
      return;
    }

    playSuccessSound();
    toast.success(`Presensi berhasil! Status: ${isLate ? "Terlambat" : "Hadir"}`);
    setAttendanceResult("success");
    setIsScanning(false);
    queryClient.invalidateQueries({ queryKey: ["student-today-list"] });
    queryClient.invalidateQueries({ queryKey: ["student-today"] });
    queryClient.invalidateQueries({ queryKey: ["student-month-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["student-chart"] });
  }, [linkedStudentId, attendanceSettings, queryClient, todayHoliday]);

  const handleSubmitLeave = async () => {
    if (!linkedStudentId) return;
    if (!leaveReason.trim()) {
      toast.error("Alasan wajib diisi");
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        student_id: linkedStudentId,
        leave_type: leaveType,
        reason: leaveReason.trim(),
        request_date: today,
      });
      if (error) throw error;
      toast.success("Pengajuan berhasil dikirim");
      setLeaveReason("");
      queryClient.invalidateQueries({ queryKey: ["student-leave-requests"] });
    } catch (err: any) {
      toast.error("Gagal mengirim pengajuan: " + err.message);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir": return <Badge className="bg-success/10 text-success border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Hadir</Badge>;
      case "terlambat": return <Badge className="bg-warning/10 text-warning border-0 gap-1 text-xs"><Clock className="w-3 h-3" />Terlambat</Badge>;
      case "izin": return <Badge className="bg-primary/10 text-primary border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Izin</Badge>;
      case "sakit": return <Badge className="bg-primary/10 text-primary border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Sakit</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0 gap-1 text-xs"><XCircle className="w-3 h-3" />Tidak Hadir</Badge>;
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-success/10 text-success border-0 text-xs">Disetujui</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Ditolak</Badge>;
      default: return <Badge className="bg-warning/10 text-warning border-0 text-xs">Menunggu</Badge>;
    }
  };

  const selfAttendanceEnabled = attendanceSettings?.enableSelfAttendance !== false;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Date */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        <span className="text-sm font-medium">{todayDisplay}</span>
      </div>

      {/* Holiday Banner */}
      <HolidayBanner compact />

      {/* Active hours */}
      {attendanceSettings && selfAttendanceEnabled && !todayHoliday && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Jam aktif presensi: <span className="font-semibold text-foreground">{attendanceSettings.attendanceStart} – {attendanceSettings.attendanceEnd}</span></span>
        </div>
      )}

      {/* Warning: no face */}
      {student && !student.has_embedding && selfAttendanceEnabled && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-center">
            <Camera className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-sm font-medium">Wajah Belum Terdaftar</p>
            <p className="text-xs text-muted-foreground mb-3">Daftarkan wajah Anda terlebih dahulu agar bisa presensi</p>
            <Button size="sm" onClick={() => setShowFaceReg(true)} className="gap-2">
              <Camera className="w-4 h-4" /> Daftar Wajah Sekarang
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="gap-1.5"><ScanFace className="w-4 h-4" />Presensi</TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5"><FileText className="w-4 h-4" />Ajukan Izin</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4 mt-4">
          {!selfAttendanceEnabled || todayHoliday ? (
            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">{todayHoliday ? "Hari Libur" : "Presensi Mandiri Tidak Aktif"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {todayHoliday ? "Hari ini libur. Presensi tidak aktif." : "Fitur presensi mandiri sedang dinonaktifkan oleh admin. Silakan hubungi admin sekolah."}
                </p>
              </CardContent>
            </Card>
          ) : (
          <>
          {/* Scan area */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-primary" />
                Presensi Mandiri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isScanning ? (
                <div className="space-y-3">
                  <FaceCamera isScanning={isScanning} onFaceDetected={handleFaceDetected} />
                  <Button variant="destructive" className="w-full" onClick={() => setIsScanning(false)}>
                    Berhenti Scan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceResult === "success" && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center">
                      <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="font-semibold text-success">Presensi Berhasil!</p>
                    </div>
                  )}
                  {attendanceResult === "already" && (
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
                      <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold text-primary">Sudah Presensi Hari Ini</p>
                    </div>
                  )}
                  {attendanceResult === "not-match" && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
                      <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                      <p className="font-semibold text-destructive">Wajah Tidak Cocok</p>
                      <p className="text-xs text-muted-foreground mt-1">Coba lagi dengan pencahayaan lebih baik</p>
                    </div>
                  )}
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    disabled={!student?.has_embedding}
                    onClick={() => { setAttendanceResult(null); setIsScanning(true); playScanStartSound(); }}
                  >
                    <ScanFace className="w-5 h-5" />
                    {todayAttendance.length > 0 ? "Scan Ulang" : "Mulai Presensi"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's history */}
          {todayAttendance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Presensi Hari Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jam</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayAttendance.map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm font-mono">{rec.time?.slice(0, 5)}</TableCell>
                        <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4 mt-4">
          {/* Leave request form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Formulir Pengajuan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis Pengajuan</Label>
                <Select value={leaveType} onValueChange={(v) => setLeaveType(v as "izin" | "sakit")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="sakit">Sakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alasan</Label>
                <Textarea
                  placeholder="Tuliskan alasan pengajuan..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSubmitLeave}
                disabled={isSubmittingLeave || !leaveReason.trim()}
              >
                {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim Pengajuan
              </Button>
            </CardContent>
          </Card>

          {/* Leave history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Riwayat Pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengajuan.</p>
              ) : (
                <div className="space-y-2">
                  {leaveRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-xs capitalize">{req.leave_type}</Badge>
                          {getLeaveStatusBadge(req.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{req.reason}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(req.request_date), "d MMM yyyy", { locale: localeId })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {student && (
        <FaceRegistrationDialog
          open={showFaceReg}
          onOpenChange={setShowFaceReg}
          student={{ id: student.id, name: student.name, nis: student.nis, className: student.class_name }}
          onRegistrationComplete={() => queryClient.invalidateQueries({ queryKey: ["student-profile"] })}
        />
      )}
    </div>
  );
}
