import { useState, useEffect, useCallback, useRef } from "react";
import { FaceCamera } from "@/components/FaceCamera";
import { StudentInfoCard, StudentInfo, AttendanceStatus } from "@/components/StudentInfoCard";

import { RecentAttendance, AttendanceRecord } from "@/components/RecentAttendance";
import { ActionButtons } from "@/components/ActionButtons";
import { supabase } from "@/integrations/supabase/client";
import { loadRegisteredFaces, findMatchingFace } from "@/services/faceRecognition";
import { useAttendanceSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { playSuccessSound, playErrorSound, playAlreadySound, playScanStartSound } from "@/lib/audio";

export default function Index() {
  const [isScanning, setIsScanning] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("idle");
  const [attendanceTime, setAttendanceTime] = useState<Date | undefined>();
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const { data: attendanceSettings } = useAttendanceSettings();
  const cooldownStudents = useRef<Map<string, number>>(new Map());

  // Load registered faces on mount
  useEffect(() => {
    loadRegisteredFaces();
  }, []);

  // Fetch stats and recent attendance
  const fetchData = useCallback(async () => {
    try {
      // Get total students
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Get today's attendance records
      const { data: todayRecords, error } = await supabase
        .from("attendance_records")
        .select(`
          id,
          status,
          time,
          date,
          student_id,
          students (
            name,
            nis,
            photo_url,
            classes (name)
          )
        `)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching attendance:", error);
        return;
      }

      // Transform to AttendanceRecord format
      const records: AttendanceRecord[] = (todayRecords || []).map((record: any) => ({
        id: record.id,
        studentName: record.students?.name || "Unknown",
        studentClass: record.students?.classes?.name || "Unknown",
        photoUrl: record.students?.photo_url || undefined,
        time: new Date(`${record.date}T${record.time}`),
        status: record.status === "terlambat" ? "late" : "ontime",
      }));

      setRecentRecords(records);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle face detection
  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    // Validate attendance is within active hours
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = attendanceSettings?.attendanceStart || "06:30";
    const end = attendanceSettings?.attendanceEnd || "08:00";

    if (currentTimeStr < start) {
      playErrorSound();
      toast.error(`Presensi belum dibuka. Jam mulai: ${start}`);
      return;
    }
    if (currentTimeStr > end) {
      playErrorSound();
      toast.error(`Presensi sudah ditutup. Jam selesai: ${end}`);
      setIsScanning(false);
      return;
    }

    // Find matching student
    const match = findMatchingFace(descriptor);

    if (!match) {
      setCurrentStudent(null);
      setAttendanceStatus("not-found");
      playErrorSound();
      toast.error("Wajah tidak dikenali dalam database");
      return;
    }

    // Check cooldown for this student
    const cooldownMs = (attendanceSettings?.cooldownSeconds ?? 5) * 1000;
    const lastSeen = cooldownStudents.current.get(match.studentId);
    if (lastSeen && (Date.now() - lastSeen) < cooldownMs) {
      return; // silently skip during cooldown
    }
    cooldownStudents.current.set(match.studentId, Date.now());

    const today = new Date().toISOString().split("T")[0];

    // Check if already recorded today
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", match.studentId)
      .eq("date", today)
      .single();

    if (existingRecord) {
      // Get class info for display
      const { data: studentData } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("id", match.studentId)
        .single();

      setCurrentStudent({
        id: match.studentId,
        name: match.studentName,
        nisn: match.studentNis,
        class: (studentData?.classes as any)?.name || match.studentClass,
        photo: studentData?.photo_url || undefined,
      });
      setAttendanceStatus("already");
      setAttendanceTime(new Date());
      playAlreadySound();
      toast.info(`${match.studentName} sudah presensi hari ini`);
      return;
    }

    // Record attendance
    const timeStr = now.toTimeString().split(" ")[0];
    
    // Determine if late based on settings
    const lateThreshold = attendanceSettings?.lateThreshold || "07:00";
    const isLate = currentTimeStr > lateThreshold;

    const { error } = await supabase
      .from("attendance_records")
      .insert({
        student_id: match.studentId,
        date: today,
        time: timeStr,
        status: isLate ? "terlambat" : "hadir",
      });

    if (error) {
      console.error("Error recording attendance:", error);
      playErrorSound();
      toast.error("Gagal mencatat presensi");
      return;
    }

    // Get full student info
    const { data: studentData } = await supabase
      .from("students")
      .select("*, classes(name)")
      .eq("id", match.studentId)
      .single();

    setCurrentStudent({
      id: match.studentId,
      name: match.studentName,
      nisn: match.studentNis,
      class: (studentData?.classes as any)?.name || match.studentClass,
      photo: studentData?.photo_url || undefined,
    });
    setAttendanceStatus("success");
    setAttendanceTime(now);
    playSuccessSound();
    toast.success(`Presensi berhasil untuk ${match.studentName}`);

    // Refresh data
    fetchData();
  }, [fetchData, attendanceSettings]);

  const handleFaceNotFound = useCallback(() => {
    // Only show if still scanning
    if (isScanning) {
      toast.warning("Tidak ada wajah terdeteksi. Pastikan wajah terlihat jelas.");
    }
  }, [isScanning]);

  const handleStartScan = () => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = attendanceSettings?.attendanceStart || "06:30";
    const end = attendanceSettings?.attendanceEnd || "08:00";

    if (currentTimeStr < start) {
      playErrorSound();
      toast.error(`Presensi belum dibuka. Jam mulai: ${start}`);
      return;
    }
    if (currentTimeStr > end) {
      playErrorSound();
      toast.error(`Presensi sudah ditutup. Jam selesai: ${end}`);
      return;
    }

    setIsScanning(true);
    setCurrentStudent(null);
    setAttendanceStatus("idle");
    playScanStartSound();
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  const handleReset = () => {
    setIsScanning(false);
    setCurrentStudent(null);
    setAttendanceStatus("idle");
    setAttendanceTime(undefined);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Presensi Wajah</h1>
        <p className="text-sm text-muted-foreground">Arahkan wajah siswa ke kamera untuk melakukan presensi</p>
      </div>


      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Camera View */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <FaceCamera 
              isScanning={isScanning}
              onFaceDetected={handleFaceDetected}
              onFaceNotFound={handleFaceNotFound}
            />
            
            <div className="mt-6">
              <ActionButtons 
                isScanning={isScanning}
                onStartScan={handleStartScan}
                onStopScan={handleStopScan}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* Student Info Card */}
          <StudentInfoCard 
            student={currentStudent}
            status={attendanceStatus}
            timestamp={attendanceTime}
          />
        </div>

        {/* Recent Attendance Sidebar */}
        <div className="lg:col-span-1">
          <RecentAttendance records={recentRecords} />
        </div>
      </div>
    </div>
  );
}
