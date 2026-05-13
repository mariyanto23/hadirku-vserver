import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string;
  is_recurring: boolean;
  created_at: string;
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays" as any)
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Holiday[];
    },
  });
}

export function useIsHoliday(date: string) {
  const { data: holidays } = useHolidays();
  if (!holidays) return null;
  
  const target = new Date(date);
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");

  return holidays.find(h => {
    if (h.date === date) return true;
    if (h.is_recurring) {
      const hDate = new Date(h.date);
      return hDate.getMonth() + 1 === parseInt(month) && hDate.getDate() === parseInt(day);
    }
    return false;
  }) || null;
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holiday: { date: string; name: string; description?: string; is_recurring?: boolean }) => {
      const { data, error } = await supabase
        .from("holidays" as any)
        .insert(holiday as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Holiday;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Hari libur berhasil ditambahkan");
    },
    onError: (e: Error) => toast.error("Gagal menambah hari libur: " + e.message),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("holidays" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Hari libur berhasil dihapus");
    },
    onError: (e: Error) => toast.error("Gagal menghapus: " + e.message),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; date?: string; description?: string; is_recurring?: boolean }) => {
      const { error } = await supabase
        .from("holidays" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Hari libur berhasil diperbarui");
    },
    onError: (e: Error) => toast.error("Gagal memperbarui: " + e.message),
  });
}
