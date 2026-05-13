import { Home, ScanFace, User, Loader2, LogOut } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/RoleLayout";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const studentMenuItems = [
  { icon: Home, label: "Beranda", path: "/student" },
  { icon: ScanFace, label: "Presensi", path: "/student/presensi", isCenter: true },
  { icon: User, label: "Profil", path: "/student/profil" },
];

export default function StudentDashboard() {
  const { linkedStudentId, loading: isLoading } = useRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: studentName } = useQuery({
    queryKey: ["student-name", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return null;
      const { data } = await supabase
        .from("students")
        .select("name")
        .eq("id", linkedStudentId)
        .single();
      return data?.name || null;
    },
    enabled: !!linkedStudentId,
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await signOut(); navigate("/login", { replace: true }); }
    catch (e: any) { toast.error(e.message); }
    finally { setIsLoggingOut(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!linkedStudentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-1">Akun Belum Terhubung</h2>
            <p className="text-sm text-muted-foreground mb-4">Akun Anda belum terhubung ke data siswa. Hubungi admin sekolah.</p>
            <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut} className="gap-2">
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RoleLayout menuItems={studentMenuItems} title="Portal Siswa" subtitle={studentName || "Dashboard Siswa"}>
      <Outlet />
    </RoleLayout>
  );
}
