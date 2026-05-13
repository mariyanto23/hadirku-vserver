import { Home, Users, FileText, User, ScanFace, Loader2, LogOut } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/RoleLayout";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const parentMenuItems = [
  { icon: Home, label: "Beranda", path: "/parent" },
  { icon: Users, label: "Anak", path: "/parent/anak" },
  { icon: FileText, label: "Laporan", path: "/parent/laporan" },
  { icon: User, label: "Profil", path: "/parent/profil" },
];

export default function ParentDashboard() {
  const { user } = useAuth();

  return (
    <RoleLayout menuItems={parentMenuItems} title="Portal Orang Tua" subtitle={user?.email}>
      <Outlet />
    </RoleLayout>
  );
}
