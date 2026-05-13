import { useState } from "react";
import { User, KeyRound, LogOut, CheckCircle, Loader2, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ParentProfile() {
  const { user, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLate, setNotifLate] = useState(true);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi password tidak cocok"); return; }
    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diubah");
    } catch (err: any) {
      toast.error("Gagal mengubah password: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Account info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Akun Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Akun Orang Tua</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ID Akun</Label>
            <p className="text-xs text-muted-foreground font-mono">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Pengaturan Notifikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifikasi Presensi</p>
              <p className="text-xs text-muted-foreground">Terima notifikasi saat anak presensi</p>
            </div>
            <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifikasi Keterlambatan</p>
              <p className="text-xs text-muted-foreground">Terima notifikasi saat anak terlambat</p>
            </div>
            <Switch checked={notifLate} onCheckedChange={setNotifLate} />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {notifEnabled ? <Bell className="w-3 h-3 text-success" /> : <BellOff className="w-3 h-3" />}
            {notifEnabled ? "Notifikasi real-time aktif untuk sesi ini" : "Notifikasi dinonaktifkan"}
          </p>
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
            <Input
              type="password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Konfirmasi Password</Label>
            <Input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              maxLength={100}
            />
          </div>
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword}
            className="gap-2"
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {savingPassword ? "Menyimpan..." : "Simpan Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
