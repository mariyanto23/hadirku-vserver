import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Clock, Bell, School, Camera, Palette, Check, Loader2, Upload, X, ImageIcon, Globe, LogOut, KeyRound, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cropAndResizeImage } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useAttendanceSettings,
  useCameraSettings,
  useNotificationSettings,
  useSchoolSettings,
  useAppearanceSettings,
  useSaveSetting,
  AttendanceSettings,
  CameraSettings,
  NotificationSettings,
  SchoolSettings,
  AppearanceSettings,
  SiteSettings,
  useSiteSettings,
} from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { BackupExport } from "@/components/BackupExport";

interface SettingsSection {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  isSaving: boolean;
  isLoading?: boolean;
}

function SettingsCard({ icon, title, description, children, onSave, isSaving, isLoading }: SettingsSection) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      <CardFooter className="border-t border-border pt-4">
        <Button 
          onClick={onSave} 
          disabled={isSaving || isLoading} 
          size="sm"
          className="gap-2 ml-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Simpan
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut, updatePassword } = useAuth();
  const saveSetting = useSaveSetting();
  
  // Account state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Fetch settings from database
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendanceSettings();
  const { data: cameraData, isLoading: loadingCamera } = useCameraSettings();
  const { data: notificationData, isLoading: loadingNotification } = useNotificationSettings();
  const { data: schoolData, isLoading: loadingSchool } = useSchoolSettings();
  const { data: appearanceData, isLoading: loadingAppearance } = useAppearanceSettings();
  const { data: siteData, isLoading: loadingSite } = useSiteSettings();
  
  // Local state for forms
  const [attendance, setAttendance] = useState<AttendanceSettings>({
    attendanceStart: "06:00",
    lateThreshold: "07:05",
    attendanceEnd: "12:00",
    timezone: "Asia/Jakarta",
    cooldownSeconds: 5,
    enableSelfAttendance: false,
    schoolDays: 5,
  });
  
  const [camera, setCamera] = useState<CameraSettings>({
    cameraResolution: "720p",
    autoCapture: true,
    captureDelay: "1",
  });
  
  const [notification, setNotification] = useState<NotificationSettings>({
    enableSound: true,
    enableNotifications: true,
    notifyLateStudents: true,
  });
  
  const [school, setSchool] = useState<SchoolSettings>({
    schoolName: "SD N 01 Jatipurwo",
    schoolAddress: "Trombol Wetan",
    adminName: "Mariyanto",
    schoolLogo: "https://cybdumnnuxesfgaqvbcm.supabase.co/storage/v1/object/public/school-assets/logo.png",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: "light",
  });

  const [site, setSite] = useState<SiteSettings>({
    siteTitle: "Sistem Presensi - SD N 01 Jatipurwo",
    siteDescription: "Sistem Presensi Wajah",
    favicon: "https://cybdumnnuxesfgaqvbcm.supabase.co/storage/v1/object/public/school-assets/favicon.png",
    appTitle: "Sistem Presensi",
    appSubtitle: "SD N 01 Jatipurwo",
    welcomeMessage: "Selamat Datang",
  });
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Saving states
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingCamera, setSavingCamera] = useState(false);
  const [savingNotification, setSavingNotification] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [savingSite, setSavingSite] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (attendanceData) setAttendance(attendanceData);
  }, [attendanceData]);
  
  useEffect(() => {
    if (cameraData) setCamera(cameraData);
  }, [cameraData]);
  
  useEffect(() => {
    if (notificationData) setNotification(notificationData);
  }, [notificationData]);
  
  useEffect(() => {
    if (schoolData) setSchool(schoolData);
  }, [schoolData]);
  
  useEffect(() => {
    if (appearanceData) setAppearance(appearanceData);
  }, [appearanceData]);

  useEffect(() => {
    if (siteData) setSite(siteData);
  }, [siteData]);

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      await saveSetting.mutateAsync({ key: "attendance", value: attendance });
      toast.success("Pengaturan waktu absensi disimpan");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveCamera = async () => {
    setSavingCamera(true);
    try {
      await saveSetting.mutateAsync({ key: "camera", value: camera });
      toast.success("Pengaturan kamera disimpan");
    } finally {
      setSavingCamera(false);
    }
  };

  const handleSaveNotification = async () => {
    setSavingNotification(true);
    try {
      await saveSetting.mutateAsync({ key: "notifications", value: notification });
      toast.success("Pengaturan notifikasi disimpan");
    } finally {
      setSavingNotification(false);
    }
  };

  const handleSaveSchool = async () => {
    setSavingSchool(true);
    try {
      await saveSetting.mutateAsync({ key: "school", value: school });
      toast.success("Informasi sekolah disimpan");
    } finally {
      setSavingSchool(false);
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  // Apply theme on load and when appearance changes
  useEffect(() => {
    applyTheme(appearance.theme);
  }, [appearance.theme]);

  // Listen for system theme changes when set to "system"
  useEffect(() => {
    if (appearance.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [appearance.theme]);

  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    try {
      await saveSetting.mutateAsync({ key: "appearance", value: appearance });
      toast.success("Pengaturan tampilan disimpan");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleSaveSite = async () => {
    setSavingSite(true);
    try {
      await saveSetting.mutateAsync({ key: "site", value: site });
      if (site.siteTitle) document.title = site.siteTitle;
      if (site.favicon) {
        let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = site.favicon;
      }
      toast.success("Setelan situs disimpan");
    } finally {
      setSavingSite(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diubah");
    } catch (error: any) {
      toast.error("Gagal mengubah password: " + error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast.error("Gagal logout: " + error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi preferensi sistem presensi</p>
      </div>

      <div className="space-y-6">
        {/* Attendance Time Settings */}
        <SettingsCard
          icon={<Clock className="w-5 h-5" />}
          title="Waktu Absensi"
          description="Atur jadwal dan batas waktu absensi"
          onSave={handleSaveAttendance}
          isSaving={savingAttendance}
          isLoading={loadingAttendance}
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attendanceStart">Mulai Absensi</Label>
              <Input
                id="attendanceStart"
                type="time"
                value={attendance.attendanceStart}
                onChange={(e) => setAttendance(prev => ({ ...prev, attendanceStart: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateThreshold">Batas Terlambat</Label>
              <Input
                id="lateThreshold"
                type="time"
                value={attendance.lateThreshold}
                onChange={(e) => setAttendance(prev => ({ ...prev, lateThreshold: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendanceEnd">Akhir Absensi</Label>
              <Input
                id="attendanceEnd"
                type="time"
                value={attendance.attendanceEnd}
                onChange={(e) => setAttendance(prev => ({ ...prev, attendanceEnd: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Waktu</Label>
            <Select value={attendance.timezone} onValueChange={(v) => setAttendance(prev => ({ ...prev, timezone: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Jakarta">WIB - Jakarta (UTC+7)</SelectItem>
                <SelectItem value="Asia/Makassar">WITA - Makassar (UTC+8)</SelectItem>
                <SelectItem value="Asia/Jayapura">WIT - Jayapura (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cooldownSeconds">Cooldown Setelah Presensi (detik)</Label>
            <Select 
              value={String(attendance.cooldownSeconds)} 
              onValueChange={(v) => setAttendance(prev => ({ ...prev, cooldownSeconds: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 detik</SelectItem>
                <SelectItem value="5">5 detik</SelectItem>
                <SelectItem value="10">10 detik</SelectItem>
                <SelectItem value="15">15 detik</SelectItem>
                <SelectItem value="30">30 detik</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Jeda waktu sebelum wajah yang sama bisa dideteksi ulang
            </p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Presensi Mandiri Siswa</p>
              <p className="text-xs text-muted-foreground">Izinkan siswa melakukan presensi sendiri melalui akun mereka</p>
            </div>
            <Switch checked={attendance.enableSelfAttendance} onCheckedChange={(v) => setAttendance(prev => ({ ...prev, enableSelfAttendance: v }))} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Hari Sekolah per Minggu</Label>
            <Select 
              value={String(attendance.schoolDays)} 
              onValueChange={(v) => setAttendance(prev => ({ ...prev, schoolDays: Number(v) as 5 | 6 }))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Hari (Senin - Jumat)</SelectItem>
                <SelectItem value="6">6 Hari (Senin - Sabtu)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {attendance.schoolDays === 5 
                ? "Sabtu & Minggu dianggap libur, presensi tidak aktif" 
                : "Hanya Minggu dianggap libur"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Siswa yang absen setelah batas terlambat akan ditandai sebagai "Terlambat"
          </p>
        </SettingsCard>

        {/* Camera Settings */}
        <SettingsCard
          icon={<Camera className="w-5 h-5" />}
          title="Kamera"
          description="Pengaturan kamera untuk pengenalan wajah"
          onSave={handleSaveCamera}
          isSaving={savingCamera}
          isLoading={loadingCamera}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cameraResolution">Resolusi Kamera</Label>
              <Select value={camera.cameraResolution} onValueChange={(v) => setCamera(prev => ({ ...prev, cameraResolution: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="captureDelay">Delay Capture (detik)</Label>
              <Select value={camera.captureDelay} onValueChange={(v) => setCamera(prev => ({ ...prev, captureDelay: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 detik</SelectItem>
                  <SelectItem value="2">2 detik</SelectItem>
                  <SelectItem value="3">3 detik</SelectItem>
                  <SelectItem value="5">5 detik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Capture Otomatis</p>
              <p className="text-xs text-muted-foreground">Otomatis mengambil foto saat wajah terdeteksi</p>
            </div>
            <Switch checked={camera.autoCapture} onCheckedChange={(v) => setCamera(prev => ({ ...prev, autoCapture: v }))} />
          </div>
        </SettingsCard>

        {/* Notification Settings */}
        <SettingsCard
          icon={<Bell className="w-5 h-5" />}
          title="Notifikasi"
          description="Pengaturan suara dan pemberitahuan"
          onSave={handleSaveNotification}
          isSaving={savingNotification}
          isLoading={loadingNotification}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Suara Notifikasi</p>
                <p className="text-xs text-muted-foreground">Bunyi saat absensi berhasil atau gagal</p>
              </div>
              <Switch checked={notification.enableSound} onCheckedChange={(v) => setNotification(prev => ({ ...prev, enableSound: v }))} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notifikasi Browser</p>
                <p className="text-xs text-muted-foreground">Tampilkan notifikasi di browser</p>
              </div>
              <Switch checked={notification.enableNotifications} onCheckedChange={(v) => setNotification(prev => ({ ...prev, enableNotifications: v }))} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Peringatan Siswa Terlambat</p>
                <p className="text-xs text-muted-foreground">Tampilkan peringatan khusus untuk siswa terlambat</p>
              </div>
              <Switch checked={notification.notifyLateStudents} onCheckedChange={(v) => setNotification(prev => ({ ...prev, notifyLateStudents: v }))} />
            </div>
          </div>
        </SettingsCard>

        {/* School Settings */}
        <SettingsCard
          icon={<School className="w-5 h-5" />}
          title="Informasi Sekolah"
          description="Data sekolah untuk laporan dan dokumen"
          onSave={handleSaveSchool}
          isSaving={savingSchool}
          isLoading={loadingSchool}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Logo Sekolah</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 flex-shrink-0">
                  {school.schoolLogo ? (
                    <img src={school.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingLogo(true);
                      try {
                        const resizedBlob = await cropAndResizeImage(file, 200);
                        const path = `logo.png`;
                        await supabase.storage.from('school-assets').remove([path]);
                        const { error } = await supabase.storage.from('school-assets').upload(path, resizedBlob, { upsert: true, contentType: 'image/png' });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('school-assets').getPublicUrl(path);
                        const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                        setSchool(prev => ({ ...prev, schoolLogo: logoUrl }));
                        toast.success("Logo berhasil diupload");
                      } catch (err: any) {
                        toast.error("Gagal upload logo: " + err.message);
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingLogo ? "Mengupload..." : "Upload Logo"}
                  </Button>
                  {school.schoolLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setSchool(prev => ({ ...prev, schoolLogo: "" }))}
                    >
                      <X className="w-4 h-4" />
                      Hapus Logo
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Format: JPG, PNG. Disarankan ukuran 200x200px</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolName">Nama Sekolah</Label>
              <Input
                id="schoolName"
                value={school.schoolName}
                onChange={(e) => setSchool(prev => ({ ...prev, schoolName: e.target.value }))}
                placeholder="Masukkan nama sekolah"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolAddress">Alamat Sekolah</Label>
              <Input
                id="schoolAddress"
                value={school.schoolAddress}
                onChange={(e) => setSchool(prev => ({ ...prev, schoolAddress: e.target.value }))}
                placeholder="Masukkan alamat sekolah"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Nama Admin</Label>
              <Input
                id="adminName"
                value={school.adminName}
                onChange={(e) => setSchool(prev => ({ ...prev, adminName: e.target.value }))}
                placeholder="Masukkan nama admin"
              />
            </div>
          </div>
        </SettingsCard>

        {/* Appearance Settings */}
        <SettingsCard
          icon={<Palette className="w-5 h-5" />}
          title="Tampilan"
          description="Sesuaikan tampilan aplikasi"
          onSave={handleSaveAppearance}
          isSaving={savingAppearance}
          isLoading={loadingAppearance}
        >
          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Select value={appearance.theme} onValueChange={(v) => setAppearance(prev => ({ ...prev, theme: v }))}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Terang</SelectItem>
                <SelectItem value="dark">Gelap</SelectItem>
                <SelectItem value="system">Ikuti Sistem</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih tema yang nyaman untuk digunakan
            </p>
          </div>
        </SettingsCard>

        {/* Site Settings */}
        <SettingsCard
          icon={<Globe className="w-5 h-5" />}
          title="Setelan Situs"
          description="Atur judul, deskripsi, dan favicon situs"
          onSave={handleSaveSite}
          isSaving={savingSite}
          isLoading={loadingSite}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appTitle">Judul Aplikasi (Login)</Label>
              <Input
                id="appTitle"
                value={site.appTitle}
                onChange={(e) => setSite(prev => ({ ...prev, appTitle: e.target.value }))}
                placeholder="Nama aplikasi di halaman login"
              />
              <p className="text-xs text-muted-foreground">Tampil sebagai judul utama di halaman login</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appSubtitle">Sub Judul Aplikasi</Label>
              <Input
                id="appSubtitle"
                value={site.appSubtitle}
                onChange={(e) => setSite(prev => ({ ...prev, appSubtitle: e.target.value }))}
                placeholder="Deskripsi singkat di bawah judul login"
              />
              <p className="text-xs text-muted-foreground">Tampil di bawah nama aplikasi di halaman login</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Pesan Selamat Datang</Label>
              <Input
                id="welcomeMessage"
                value={site.welcomeMessage}
                onChange={(e) => setSite(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                placeholder="Pesan sambutan di dashboard"
              />
              <p className="text-xs text-muted-foreground">Tampil di beranda admin, misalnya "Selamat Datang"</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="siteTitle">Judul Situs</Label>
              <Input
                id="siteTitle"
                value={site.siteTitle}
                onChange={(e) => setSite(prev => ({ ...prev, siteTitle: e.target.value }))}
                placeholder="Judul yang tampil di tab browser"
              />
              <p className="text-xs text-muted-foreground">Tampil di tab browser dan hasil pencarian</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Deskripsi Situs</Label>
              <Input
                id="siteDescription"
                value={site.siteDescription}
                onChange={(e) => setSite(prev => ({ ...prev, siteDescription: e.target.value }))}
                placeholder="Deskripsi singkat situs"
              />
              <p className="text-xs text-muted-foreground">Tampil di hasil pencarian Google</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 flex-shrink-0">
                  {site.favicon ? (
                    <img src={site.favicon} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingFavicon(true);
                      try {
                        const resizedBlob = await cropAndResizeImage(file, 64);
                        const path = `favicon.png`;
                        await supabase.storage.from('school-assets').remove([path]);
                        const { error } = await supabase.storage.from('school-assets').upload(path, resizedBlob, { upsert: true, contentType: 'image/png' });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('school-assets').getPublicUrl(path);
                        const faviconUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                        setSite(prev => ({ ...prev, favicon: faviconUrl }));
                        toast.success("Favicon berhasil diupload");
                      } catch (err: any) {
                        toast.error("Gagal upload favicon: " + err.message);
                      } finally {
                        setUploadingFavicon(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadingFavicon}
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    {uploadingFavicon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingFavicon ? "Mengupload..." : "Upload Favicon"}
                  </Button>
                  {site.favicon && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setSite(prev => ({ ...prev, favicon: "" }))}
                    >
                      <X className="w-4 h-4" />
                      Hapus Favicon
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ikon kecil yang tampil di tab browser. Format: PNG, ICO, SVG. Otomatis di-resize ke 64x64px</p>
            </div>
          </div>
        </SettingsCard>

        {/* Backup Export */}
        <BackupExport />

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Akun</CardTitle>
                <CardDescription>Kelola akun dan keamanan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="text-sm font-medium">{user?.email || "-"}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="font-medium flex items-center gap-2"><KeyRound className="w-4 h-4" /> Ubah Password</Label>
              <Input
                type="password"
                placeholder="Password baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                maxLength={100}
              />
              <Input
                type="password"
                placeholder="Konfirmasi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={100}
              />
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={handleChangePassword} 
                disabled={savingPassword || !newPassword}
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingPassword ? "Menyimpan..." : "Simpan Password"}
              </Button>
            </div>
            <Separator />
            <Button 
              variant="destructive" 
              className="gap-2" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
