import { useState, useEffect } from "react";
import { Download, CheckCircle, Smartphone, Monitor, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSiteSettings, useSchoolSettings } from "@/hooks/useSettings";
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const { data: siteSettingsData } = useSiteSettings();
  const { data: schoolSettingsData } = useSchoolSettings();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const appName = siteSettingsData?.appTitle || "Sistem Presensi";
  const schoolLogo = schoolSettingsData?.schoolLogo || "";

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (isStandalone) setIsInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Smartphone className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">Install {appName}</CardTitle>
          <CardDescription>Install aplikasi ke perangkat Anda untuk akses cepat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center p-6 rounded-xl bg-success/10 border border-success/30">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="font-semibold text-success">Aplikasi Sudah Terinstall!</p>
              <p className="text-sm text-muted-foreground mt-1">Buka dari home screen perangkat Anda</p>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <p className="text-sm font-medium">Cara install di iPhone/iPad:</p>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Ketuk tombol <Share className="w-4 h-4 inline" /> <strong>Share</strong> di Safari</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Scroll ke bawah dan ketuk <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Ketuk <strong>"Add"</strong> untuk menginstall</p>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button className="w-full gap-2" size="lg" onClick={handleInstall}>
              <Download className="w-5 h-5" />
              Install Sekarang
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <p className="text-sm font-medium flex items-center gap-2"><Monitor className="w-4 h-4" /> Cara install:</p>
              <p className="text-sm text-muted-foreground">
                Buka menu browser (⋮) lalu pilih <strong>"Install app"</strong> atau <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          )}

          <div className="text-center">
            <a href="/login" className="text-sm text-primary hover:underline">← Kembali ke Login</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
