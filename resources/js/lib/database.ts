import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ClassData {
  id: string;
  name: string;
}

export interface StudentData {
  id: string;
  nis: string;
  name: string;
  class_id: string | null;
  class_name?: string;
  photo_url: string | null;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_class?: string;
  date: string;
  time: string;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "tidak-hadir";
  created_at: string;
}

// Classes
export async function getClasses(): Promise<ClassData[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("name");
  
  if (error) throw error;
  return data || [];
}

// Students
export async function getStudents(): Promise<StudentData[]> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      classes (name)
    `)
    .order("name");
  
  if (error) throw error;
  
  return (data || []).map(student => ({
    ...student,
    class_name: student.classes?.name || null
  }));
}

export async function createStudent(student: {
  nis: string;
  name: string;
  class_id: string;
  photo_url?: string;
}): Promise<StudentData> {
  const { data, error } = await supabase
    .from("students")
    .insert(student)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateStudent(
  id: string,
  updates: Partial<{
    nis: string;
    name: string;
    class_id: string;
    photo_url: string;
    has_embedding: boolean;
  }>
): Promise<StudentData> {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Attendance
export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      students (name, classes (name))
    `)
    .eq("date", date)
    .order("time", { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(record => ({
    id: record.id,
    student_id: record.student_id,
    date: record.date,
    time: record.time,
    status: record.status as AttendanceRecord["status"],
    created_at: record.created_at,
    student_name: record.students?.name || "Unknown",
    student_class: record.students?.classes?.name || "Unknown"
  }));
}

export async function getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      students (name, classes (name))
    `)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(record => ({
    id: record.id,
    student_id: record.student_id,
    date: record.date,
    time: record.time,
    status: record.status as AttendanceRecord["status"],
    created_at: record.created_at,
    student_name: record.students?.name || "Unknown",
    student_class: record.students?.classes?.name || "Unknown"
  }));
}

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().split("T")[0];
  return getAttendanceByDate(today);
}

export async function createAttendance(record: {
  student_id: string;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "tidak-hadir";
  time?: string;
}): Promise<AttendanceRecord> {
  const today = new Date().toISOString().split("T")[0];
  const currentTime = new Date().toTimeString().split(" ")[0];
  
  const { data, error } = await supabase
    .from("attendance_records")
    .upsert({
      student_id: record.student_id,
      date: today,
      time: record.time || currentTime,
      status: record.status
    }, { onConflict: "student_id,date" })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    student_id: data.student_id,
    date: data.date,
    time: data.time,
    status: data.status as AttendanceRecord["status"],
    created_at: data.created_at,
  };
}

// Settings
export async function getSetting(key: string): Promise<unknown | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  
  if (error) throw error;
  return data?.value || null;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  // Check if setting exists
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();
  
  const jsonValue = value as Json;
  
  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("app_settings")
      .update({ value: jsonValue })
      .eq("key", key);
    if (error) throw error;
  } else {
    // Insert new
    const { error } = await supabase
      .from("app_settings")
      .insert([{ key, value: jsonValue }]);
    if (error) throw error;
  }
}

// Photo Upload - returns the storage file path (not a public URL)
export async function uploadStudentPhoto(file: File, studentId: string): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${studentId}.${fileExt}`;
  const filePath = `photos/${fileName}`;
  
  const { error } = await supabase.storage
    .from("student-photos")
    .upload(filePath, file, { upsert: true });
  
  if (error) throw error;
  
  // Return the file path for signed URL resolution
  return filePath;
}
