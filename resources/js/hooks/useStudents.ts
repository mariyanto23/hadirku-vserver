import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClasses,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentPhoto,
  ClassData,
  StudentData,
} from "@/lib/database";
import { toast } from "sonner";

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: getClasses,
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      nis: string;
      name: string;
      class_id: string;
      photoFile?: File;
    }) => {
      // First create the student
      const student = await createStudent({
        nis: data.nis,
        name: data.name,
        class_id: data.class_id,
      });
      
      // Then upload photo if provided
      if (data.photoFile) {
        const photoUrl = await uploadStudentPhoto(data.photoFile, student.id);
        await updateStudent(student.id, { photo_url: photoUrl });
        student.photo_url = photoUrl;
      }
      
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Siswa berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambahkan siswa: ${error.message}`);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      nis?: string;
      name?: string;
      class_id?: string;
      photoFile?: File;
    }) => {
      const updates: Partial<StudentData> = {};
      
      if (data.nis) updates.nis = data.nis;
      if (data.name) updates.name = data.name;
      if (data.class_id) updates.class_id = data.class_id;
      
      // Upload new photo if provided
      if (data.photoFile) {
        const photoUrl = await uploadStudentPhoto(data.photoFile, data.id);
        updates.photo_url = photoUrl;
      }
      
      return updateStudent(data.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Data siswa berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui siswa: ${error.message}`);
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Siswa berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus siswa: ${error.message}`);
    },
  });
}
