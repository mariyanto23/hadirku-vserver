import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, CheckCircle, Clock, XCircle, ScanFace, Camera, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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

export default function StudentAttendance() {
  const { linkedStudentId } = useRole();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState<string | null>(null);
  const [showFaceReg, setShowFaceReg] = useState(false);
  const { data: attendanceSettings } = useAttendanceSettings();
  const todayHoliday = useIsTodayOff();

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

    const today = now.toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", linkedStudentId)
      .eq("date", today)
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
      date: today,
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
    queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
  }, [linkedStudentId, attendanceSettings, queryClient, todayHoliday]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <CalendarDays className="w-4 h-4" />
        <span className="text-sm">{format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}</span>
      </div>

      <HolidayBanner compact />

      {todayHoliday ? (
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground">Hari Libur</p>
            <p className="text-sm text-muted-foreground mt-1">Hari ini libur. Presensi tidak aktif.</p>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Presensi Mandiri</h2>
            <p className="text-sm text-muted-foreground">Scan wajah Anda untuk melakukan presensi</p>
            {attendanceSettings && (
              <p className="text-xs text-muted-foreground mt-1">
                Jam aktif: {attendanceSettings.attendanceStart} – {attendanceSettings.attendanceEnd}
              </p>
            )}
          </div>

          {isScanning ? (
            <div className="space-y-4">
              <FaceCamera isScanning={isScanning} onFaceDetected={handleFaceDetected} />
              <Button variant="destructive" className="w-full" onClick={() => setIsScanning(false)}>Berhenti</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceResult === "success" && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-medium text-success">Presensi Berhasil!</p>
                </div>
              )}
              {attendanceResult === "already" && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                  <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium text-primary">Anda sudah presensi hari ini</p>
                </div>
              )}
              {attendanceResult === "not-match" && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                  <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="font-medium text-destructive">Wajah tidak cocok</p>
                </div>
              )}
              <Button className="w-full gap-2" size="lg" onClick={() => { setAttendanceResult(null); setIsScanning(true); playScanStartSound(); }}>
                <ScanFace className="w-5 h-5" /> Mulai Presensi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {student && !student.has_embedding && !todayHoliday && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-center">
            <Camera className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-sm font-medium">Wajah Belum Terdaftar</p>
            <p className="text-xs text-muted-foreground mb-3">Daftarkan wajah Anda agar bisa presensi mandiri</p>
            <Button size="sm" onClick={() => setShowFaceReg(true)} className="gap-2">
              <Camera className="w-4 h-4" /> Daftar Wajah
            </Button>
          </CardContent>
        </Card>
      )}

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
