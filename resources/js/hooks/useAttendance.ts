import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceByDate,
  getAttendanceByDateRange,
  getTodayAttendance,
  createAttendance,
  AttendanceRecord,
} from "@/lib/database";
import { toast } from "sonner";

export function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: getTodayAttendance,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: () => getAttendanceByDate(date),
    enabled: !!date,
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Presensi berhasil dicatat");
    },
    onError: (error: Error) => {
      toast.error(`Gagal mencatat presensi: ${error.message}`);
    },
  });
}
