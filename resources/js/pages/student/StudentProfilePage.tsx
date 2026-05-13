import { useState } from "react";
import { User, KeyRound, LogOut, CheckCircle, XCircle, Camera, Loader2, CalendarRange } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FaceRegistrationDialog } from "@/components/FaceRegistrationDialog";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMemo } from "react";

export default function StudentProfilePage() {
  const { user, updatePassword, signOut } = useAuth();
  const { linkedStudentId } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showFaceReg, setShowFaceReg] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dateRange, setDateRange] = useState("30");

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

  const dateFrom = useMemo(() => format(subDays(new Date(), parseInt(dateRange) - 1), "yyyy-MM-dd"), [dateRange]);
  const dateTo = format(new Date(), "yyyy-MM-dd");

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["student-profile-history", linkedStudentId, dateFrom, dateTo],
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
    return { hadir, terlambat, total: attendance.length };
  }, [attendance]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi password tidak cocok"); return; }
    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword(""); setConfirmPassword("");
      toast.success("Password berhasil diubah");
    } catch (err: any) { toast.error("Gagal: " + err.message); }
    finally { setSavingPassword(false); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err: any) { toast.error(err.message); }
    finally { setIsLoggingOut(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hadir": return <Badge className="bg-success/10 text-success border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Hadir</Badge>;
      case "terlambat": return <Badge className="bg-warning/10 text-warning border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3 text-warning" />Terlambat</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0 gap-1 text-xs"><XCircle className="w-3 h-3" />Tidak Hadir</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Profile card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Data Diri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {student?.photo_url
                ? <SignedImage storageSrc={student.photo_url} alt={student.name} className="w-full h-full object-cover" fallback={<User className="w-8 h-8 text-primary" />} />
                : <User className="w-8 h-8 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-base">{student?.name}</p>
              <p className="text-sm text-muted-foreground">Kelas {student?.class_name}</p>
              <p className="text-xs text-muted-foreground">NIS: {student?.nis}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm truncate">{user?.email}</p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Status Wajah</Label>
              <div>
                {student?.has_embedding
                  ? <Badge className="bg-success/10 text-success border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Terdaftar</Badge>
                  : <Badge className="bg-warning/10 text-warning border-0 gap-1 text-xs"><XCircle className="w-3 h-3" />Belum</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Face registration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Camera className="w-4 h-4" />Registrasi Wajah</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {student?.has_embedding
              ? "Wajah Anda sudah terdaftar. Tambah data wajah untuk meningkatkan akurasi."
              : "Daftarkan wajah Anda agar bisa presensi mandiri."}
          </p>
          <Button onClick={() => setShowFaceReg(true)} className="gap-2">
            <Camera className="w-4 h-4" />
            {student?.has_embedding ? "Tambah Data Wajah" : "Daftar Wajah"}
          </Button>
        </CardContent>
      </Card>

      {/* Attendance history */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2"><CalendarRange className="w-4 h-4" />Riwayat Presensi</CardTitle>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Hari</SelectItem>
                <SelectItem value="14">14 Hari</SelectItem>
                <SelectItem value="30">30 Hari</SelectItem>
                <SelectItem value="90">3 Bulan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-success/10">
              <p className="text-lg font-bold text-success">{stats.hadir}</p>
              <p className="text-xs text-muted-foreground">Hadir</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/10">
              <p className="text-lg font-bold text-warning">{stats.terlambat}</p>
              <p className="text-xs text-muted-foreground">Terlambat</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          {loadingAtt ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data presensi.</p>
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

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="w-4 h-4" />Ubah Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Password Baru</Label>
            <Input type="password" placeholder="Minimal 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Konfirmasi Password</Label>
            <Input type="password" placeholder="Ulangi password baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={100} />
          </div>
          <Button size="sm" onClick={handleChangePassword} disabled={savingPassword || !newPassword} className="gap-2">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {savingPassword ? "Menyimpan..." : "Simpan Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full gap-2" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
          </Button>
        </CardContent>
      </Card>

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
