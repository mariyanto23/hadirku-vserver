import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  // Tampilkan spinner selama auth atau role masih loading
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Belum login → ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role wajib ada untuk route terproteksi
  if (allowedRoles && !role) {
    return <Navigate to="/login" replace />;
  }

  // Role sudah ter-load dan tidak sesuai → arahkan ke dashboard yang benar
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === "student") return <Navigate to="/student" replace />;
    if (role === "parent") return <Navigate to="/parent" replace />;
    if (role === "admin") return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
