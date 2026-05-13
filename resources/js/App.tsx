import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { usePWASettings } from "./hooks/usePWASettings";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Students from "./pages/Students";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Student pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentHome from "./pages/student/StudentHome";
import StudentAttendancePage from "./pages/student/StudentAttendancePage";
import StudentProfilePage from "./pages/student/StudentProfilePage";

// Parent pages
import ParentDashboard from "./pages/ParentDashboard";
import ParentHome from "./pages/parent/ParentHome";
import ParentChildren from "./pages/parent/ParentChildren";
import ParentReports from "./pages/parent/ParentReports";
import ParentProfile from "./pages/parent/ParentProfile";

import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PWASync() {
  usePWASettings();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PWASync />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/install" element={<Install />} />

          {/* Student routes */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>}>
            <Route index element={<StudentHome />} />
            <Route path="presensi" element={<StudentAttendancePage />} />
            <Route path="profil" element={<StudentProfilePage />} />
          </Route>

          {/* Parent routes */}
          <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>}>
            <Route index element={<ParentHome />} />
            <Route path="anak" element={<ParentChildren />} />
            <Route path="laporan" element={<ParentReports />} />
            <Route path="profil" element={<ParentProfile />} />
          </Route>

          {/* Admin routes */}
          <Route path="/" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><Index /></Layout></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><Students /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Layout><Settings /></Layout></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
