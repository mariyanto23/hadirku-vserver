// School Information
export const SCHOOL_INFO = {
  name: "SD N 01 Jatipurwo",
  address: "Trombol Wetan",
  adminName: "Mariyanto",
} as const;

// Available classes for SD (Elementary School)
export const CLASSES = [
  { id: "kelas-1", name: "Kelas 1" },
  { id: "kelas-2", name: "Kelas 2" },
  { id: "kelas-3", name: "Kelas 3" },
  { id: "kelas-4", name: "Kelas 4" },
  { id: "kelas-5", name: "Kelas 5" },
  { id: "kelas-6", name: "Kelas 6" },
] as const;

export type ClassName = typeof CLASSES[number]["name"];
