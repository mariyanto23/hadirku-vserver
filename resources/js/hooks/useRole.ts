import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Keep loading=true while auth is still resolving
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setRole(null);
      setLinkedStudentId(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      try {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) throw roleError;
        const userRole = roleData?.role ?? null;
        setRole(userRole);

        if (userRole === "student") {
          const { data: linkData } = await supabase
            .from("student_user_links")
            .select("student_id")
            .eq("user_id", user.id)
            .maybeSingle();
          setLinkedStudentId(linkData?.student_id ?? null);
        } else {
          setLinkedStudentId(null);
        }
      } catch (err) {
        console.error("Error fetching role:", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isParent = role === "parent";

  return { role, loading, isAdmin, isStudent, isParent, linkedStudentId };
}
