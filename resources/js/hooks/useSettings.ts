import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSetting, saveSetting } from "@/lib/database";
import { SCHOOL_INFO } from "@/lib/constants";
import { toast } from "sonner";

export interface AttendanceSettings {
  attendanceStart: string;
  lateThreshold: string;
  attendanceEnd: string;
  timezone: string;
  cooldownSeconds: number;
  enableSelfAttendance: boolean;
  schoolDays: 5 | 6;
}

export interface CameraSettings {
  cameraResolution: string;
  autoCapture: boolean;
  captureDelay: string;
}

export interface NotificationSettings {
  enableSound: boolean;
  enableNotifications: boolean;
  notifyLateStudents: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  schoolAddress: string;
  adminName: string;
  schoolLogo: string;
}

export interface AppearanceSettings {
  theme: string;
}

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  favicon: string;
  appTitle: string;
  appSubtitle: string;
  welcomeMessage: string;
}

export function useSettings<T>(key: string, defaultValue: T) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: async () => {
      const value = await getSetting(key);
      return (value as T) || defaultValue;
    },
  });
}

export function useSaveSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      await saveSetting(key, value);
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["settings", key] });
    },
    onError: (error: Error) => {
      toast.error(`Gagal menyimpan pengaturan: ${error.message}`);
    },
  });
}

// Convenience hooks for specific settings
export function useAttendanceSettings() {
  return useSettings<AttendanceSettings>("attendance", {
    attendanceStart: "06:00",
    lateThreshold: "07:05",
    attendanceEnd: "12:00",
    timezone: "Asia/Jakarta",
    cooldownSeconds: 5,
    enableSelfAttendance: false,
    schoolDays: 5,
  });
}

export function useCameraSettings() {
  return useSettings<CameraSettings>("camera", {
    cameraResolution: "720p",
    autoCapture: true,
    captureDelay: "1",
  });
}

export function useNotificationSettings() {
  return useSettings<NotificationSettings>("notifications", {
    enableSound: true,
    enableNotifications: true,
    notifyLateStudents: true,
  });
}

export function useSchoolSettings() {
  return useSettings<SchoolSettings>("school", {
    schoolName: SCHOOL_INFO.name,
    schoolAddress: SCHOOL_INFO.address,
    adminName: SCHOOL_INFO.adminName,
    schoolLogo: "https://cybdumnnuxesfgaqvbcm.supabase.co/storage/v1/object/public/school-assets/logo.png",
  });
}

export function useAppearanceSettings() {
  return useSettings<AppearanceSettings>("appearance", {
    theme: "light",
  });
}

export function useSiteSettings() {
  return useSettings<SiteSettings>("site", {
    siteTitle: "Sistem Presensi - SD N 01 Jatipurwo",
    siteDescription: "Sistem Presensi Wajah",
    favicon: "https://cybdumnnuxesfgaqvbcm.supabase.co/storage/v1/object/public/school-assets/favicon.png",
    appTitle: "Sistem Presensi",
    appSubtitle: "SD N 01 Jatipurwo",
    welcomeMessage: "Selamat Datang",
  });
}
