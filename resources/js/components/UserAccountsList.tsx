import { useState } from "react";
import { Users, GraduationCap, Loader2, Trash2, RefreshCw, Pencil, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";

interface UserAccount {
  user_id: string;
  role: string;
  email?: string;
  student_names: string[];
  student_ids: string[];
}

export function UserAccountsList() {
  const queryClient = useQueryClient();
  const { data: allStudents = [] } = useStudents();
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["user-accounts-list"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["student", "parent"])
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);

      const { data: studentLinks } = await supabase
        .from("student_user_links")
        .select("user_id, student_id, students(name)")
        .in("user_id", userIds);

      const { data: parentLinks } = await supabase
        .from("parent_student_links")
        .select("parent_user_id, student_id, students(name)")
        .in("parent_user_id", userIds);

      return roles.map(r => {
        let studentNames: string[] = [];
        let studentIds: string[] = [];
        if (r.role === "student") {
          const links = (studentLinks || []).filter((l: any) => l.user_id === r.user_id);
          studentNames = links.map((l: any) => l.students?.name || "-");
          studentIds = links.map((l: any) => l.student_id);
        } else if (r.role === "parent") {
          const links = (parentLinks || []).filter((l: any) => l.parent_user_id === r.user_id);
          studentNames = links.map((l: any) => l.students?.name || "-");
          studentIds = links.map((l: any) => l.student_id);
        }
        return { user_id: r.user_id, role: r.role, student_names: studentNames, student_ids: studentIds } as UserAccount;
      });
    },
  });

  const filteredAccounts = roleFilter === "all" ? accounts : accounts.filter(a => a.role === roleFilter);

  const handleDelete = async (userId: string, role: string) => {
    try {
      if (role === "student") {
        await supabase.from("student_user_links").delete().eq("user_id", userId);
      } else {
        await supabase.from("parent_student_links").delete().eq("parent_user_id", userId);
      }
      await supabase.from("user_roles").delete().eq("user_id", userId);
      toast.success("Akun berhasil dihapus dari sistem");
      queryClient.invalidateQueries({ queryKey: ["user-accounts-list"] });
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  const handleEditOpen = async (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditStudentIds([...acc.student_ids]);
    setEditEmail("");
    setEditPassword("");
    setShowPassword(false);
    setIsLoadingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-user-account", {
        body: { action: "get_email", user_id: acc.user_id },
      });
      if (error) throw error;
      setEditEmail(data.email || "");
    } catch (err: any) {
      toast.error("Gagal memuat email: " + err.message);
      setEditEmail("");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingAccount) return;
    setIsSaving(true);
    try {
      // Update email/password if changed
      const updateFields: Record<string, string> = {};
      if (editEmail.trim() && editEmail !== editingAccount.email) {
        updateFields.email = editEmail.trim();
      }
      if (editPassword.trim()) {
        if (editPassword.length < 6) {
          toast.error("Password minimal 6 karakter");
          setIsSaving(false);
          return;
        }
        updateFields.password = editPassword.trim();
      }

      if (Object.keys(updateFields).length > 0) {
        const { data, error } = await supabase.functions.invoke("manage-user-account", {
          body: { action: "update", user_id: editingAccount.user_id, ...updateFields },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      // Update links (only for parent role)
      if (editingAccount.role === "parent") {
        await supabase.from("parent_student_links").delete().eq("parent_user_id", editingAccount.user_id);
        if (editStudentIds.length > 0) {
          const links = editStudentIds.map(sid => ({ parent_user_id: editingAccount.user_id, student_id: sid }));
          await supabase.from("parent_student_links").insert(links);
        }
      }

      toast.success("Data berhasil diperbarui");
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ["user-accounts-list"] });
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditStudent = (studentId: string) => {
    setEditStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Daftar Akun Pengguna</CardTitle>
                <CardDescription>Akun siswa dan orang tua yang sudah dibuat</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="student">Siswa</SelectItem>
                  <SelectItem value="parent">Orang Tua</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["user-accounts-list"] })}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada akun pengguna.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Terhubung ke</TableHead>
                    <TableHead className="w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((acc) => (
                    <TableRow key={acc.user_id}>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {acc.role === "student" ? <GraduationCap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {acc.role === "student" ? "Siswa" : "Orang Tua"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {acc.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {acc.student_names.length > 0
                            ? acc.student_names.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                              ))
                            : <span className="text-xs text-muted-foreground">-</span>
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleEditOpen(acc)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Role dan link akun ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(acc.user_id, acc.role)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Akun Pengguna</DialogTitle>
            <DialogDescription>Ubah email, password, atau hubungan akun pengguna</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="secondary" className="gap-1">
                  {editingAccount.role === "student" ? <GraduationCap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {editingAccount.role === "student" ? "Siswa" : "Orang Tua"}
                </Badge>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email</Label>
                {isLoadingEmail ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
                  </div>
                ) : (
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email pengguna"
                  />
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label>Password Baru (opsional)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah"
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

              {/* Student links - only for parent */}
              {editingAccount.role === "parent" && (
                <div>
                  <Label className="mb-2 block">Hubungkan ke Anak</Label>
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {allStudents.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={editStudentIds.includes(s.id)}
                          onCheckedChange={() => toggleEditStudent(s.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.nis} · {s.class_name || "-"}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)}>Batal</Button>
            <Button onClick={handleEditSave} disabled={isSaving} className="gap-1">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
