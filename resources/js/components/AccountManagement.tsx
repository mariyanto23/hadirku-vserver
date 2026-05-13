import { useState } from "react";
import { UserPlus, Loader2, Eye, EyeOff, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function AccountManagement() {
  const { data: students = [] } = useStudents();
  
  // Fetch already-linked student IDs
  const { data: linkedStudentIds = [] } = useQuery({
    queryKey: ["linked-student-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("student_user_links").select("student_id");
      return (data || []).map(d => d.student_id);
    },
  });

  const availableStudents = students.filter(s => !linkedStudentIds.includes(s.id));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "parent">("student");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedParentStudentIds, setSelectedParentStudentIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (role === "student" && !selectedStudentId) {
      toast.error("Pilih siswa yang akan dihubungkan");
      return;
    }
    if (role === "parent" && selectedParentStudentIds.length === 0) {
      toast.error("Pilih minimal satu siswa");
      return;
    }

    setIsCreating(true);
    try {
      const body: any = { email, password, role };
      if (role === "student") body.student_id = selectedStudentId;
      if (role === "parent") body.student_ids = selectedParentStudentIds;

      const { data: result, error: fnError } = await supabase.functions.invoke(
        "create-user-account",
        { body }
      );

      if (fnError) {
        throw new Error(fnError.message || "Gagal membuat akun");
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success(`Akun ${role} berhasil dibuat untuk ${email}`);
      // Reset form
      setEmail("");
      setPassword("");
      setSelectedStudentId("");
      setSelectedParentStudentIds([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleParentStudent = (studentId: string) => {
    setSelectedParentStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Buat Akun Pengguna</CardTitle>
            <CardDescription>Buat akun siswa atau orang tua</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <Label>Tipe Akun</Label>
          <Select value={role} onValueChange={(v) => { setRole(v as "student" | "parent"); setSelectedStudentId(""); setSelectedParentStudentIds([]); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">
                <span className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Siswa</span>
              </SelectItem>
              <SelectItem value="parent">
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Orang Tua</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Student Selection for Student Role */}
        {role === "student" && (
          <div className="space-y-2">
            <Label>Hubungkan ke Siswa</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih siswa" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.nis}) - {s.class_name || "-"}
                  </SelectItem>
                ))}
                {availableStudents.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">Semua siswa sudah terhubung</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Student Selection for Parent Role */}
        {role === "parent" && (
          <div className="space-y-2">
            <Label>Hubungkan ke Anak</Label>
            <p className="text-xs text-muted-foreground">Pilih satu atau lebih siswa</p>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedParentStudentIds.includes(s.id)}
                    onCheckedChange={() => toggleParentStudent(s.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.nis} · {s.class_name || "-"}</p>
                  </div>
                </label>
              ))}
            </div>
            {selectedParentStudentIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedParentStudentIds.map(id => {
                  const s = students.find(st => st.id === id);
                  return s ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {s.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full gap-2"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Membuat Akun...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Buat Akun
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
