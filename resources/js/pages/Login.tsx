import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, GraduationCap, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useSiteSettings, useSchoolSettings } from "@/hooks/useSettings";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const { data: siteSettings } = useSiteSettings();
  const { data: schoolSettings } = useSchoolSettings();
  const appTitle = siteSettings?.appTitle || "Sistem Presensi";
  const appSubtitle = siteSettings?.appSubtitle || "SD N 01 Jatipurwo";
  const welcomeMessage = siteSettings?.welcomeMessage || "Selamat Datang";
  const schoolLogo = schoolSettings?.schoolLogo || "";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  // Redirect based on role if already logged in
  useEffect(() => {
    if (!loading && !roleLoading && user && role) {
      if (role === "student") navigate("/student", { replace: true });
      else if (role === "parent") navigate("/parent", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, loading, role, roleLoading, navigate]);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;

      // Get user ID from the active session directly
      const session = loginData?.session ?? (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id;
      let userRole = session?.user?.role;

      if (!userId) throw new Error("Sesi tidak ditemukan setelah login");

      // Fetch role using the confirmed user ID
      if (!userRole) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        userRole = roleData?.role;
      }
      
      toast({
        title: "Login Berhasil",
        description: `${welcomeMessage} di ${appTitle}`,
      });

      if (userRole === "student") navigate("/student", { replace: true });
      else if (userRole === "parent") navigate("/parent", { replace: true });
      else if (userRole === "admin") navigate("/", { replace: true });
      else {
        await supabase.auth.signOut();
        throw new Error("Akun tidak memiliki role. Hubungi admin untuk menetapkan role akun.");
      }
    } catch (error: any) {
      toast({
        title: "Login Gagal",
        description: error.message === "Invalid login credentials"
          ? "Email atau password salah"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: "email" | "password", value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8 animate-fade-in-up">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-lg overflow-hidden">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{appTitle}</h1>
            <p className="text-muted-foreground mt-1">{appSubtitle}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`h-12 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={isLoading}
                maxLength={255}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={`h-12 pr-12 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  disabled={isLoading}
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Masuk sebagai admin, siswa, atau orang tua
            </p>
            <a href="/install" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              📲 Install Aplikasi
            </a>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 {appTitle}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
