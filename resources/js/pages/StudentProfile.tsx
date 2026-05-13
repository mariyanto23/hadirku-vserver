import { useState } from "react";
import { CheckCircle, XCircle, User, Camera, KeyRound, Loader2 } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FaceRegistrationDialog } from "@/components/FaceRegistrationDialog";

export default function StudentProfile() {
  const { user, updatePassword } = useAuth();
  const { linkedStudentId } = useRole();
  const queryClient = useQueryClient();
  const [showFaceReg, setShowFaceReg] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

  const { data: faceCount = 0 } = useQuery({
    queryKey: ["face-descriptor-count", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return 0;
      const { count, error } = await supabase
        .from("face_descriptors")
        .select("id", { count: "exact", head: true })
        .eq("student_id", linkedStudentId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!linkedStudentId,
  });

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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Profil Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {student?.photo_url ? <SignedImage storageSrc={student.photo_url} alt={student.name} className="w-full h-full object-cover" fallback={<User className="w-8 h-8 text-primary" />} /> : <User className="w-8 h-8 text-primary" />}
            </div>
            <div>
              <p className="font-semibold text-foreground">{student?.name}</p>
              <p className="text-sm text-muted-foreground">{student?.class_name}</p>
              <p className="text-xs text-muted-foreground">NIS: {student?.nis}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status Wajah</Label>
            <div>
              {student?.has_embedding
                ? <Badge className="bg-success/10 text-success border-0 gap-1"><CheckCircle className="w-3 h-3" />Terdaftar</Badge>
                : <Badge className="bg-warning/10 text-warning border-0 gap-1"><XCircle className="w-3 h-3" />Belum Terdaftar</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Registrasi Wajah</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {student?.has_embedding 
              ? `Wajah Anda sudah terdaftar (${faceCount} data). Tambah data wajah untuk meningkatkan akurasi.` 
              : "Daftarkan wajah Anda agar bisa presensi mandiri."}
          </p>
          <Button onClick={() => setShowFaceReg(true)} className="gap-2">
            <Camera className="w-4 h-4" /> {student?.has_embedding ? "Tambah Data Wajah" : "Daftar Wajah"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Ubah Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="Password baru" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} maxLength={100} />
          <Input type="password" placeholder="Konfirmasi password baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={100} />
          <Button size="sm" onClick={handleChangePassword} disabled={savingPassword || !newPassword} className="gap-2">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {savingPassword ? "Menyimpan..." : "Simpan Password"}
          </Button>
        </CardContent>
      </Card>

      {student && (
        <FaceRegistrationDialog
          open={showFaceReg}
          onOpenChange={setShowFaceReg}
          student={{ id: student.id, name: student.name, nis: student.nis, className: student.class_name }}
          onRegistrationComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["student-profile"] });
            queryClient.invalidateQueries({ queryKey: ["face-descriptor-count"] });
          }}
        />
      )}
    </div>
  );
}
