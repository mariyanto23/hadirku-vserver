import { supabase } from "@/integrations/supabase/client";
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
let modelsLoaded = false;

// Load models if not already loaded
export async function ensureModelsLoaded(): Promise<boolean> {
  if (modelsLoaded) return true;
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading face models:", error);
    return false;
  }
}

// Detect face from an image element and get descriptor
export async function detectFaceFromImage(image: HTMLImageElement): Promise<Float32Array | null> {
  try {
    await ensureModelsLoaded();
    
    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5,
      }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      return detection.descriptor;
    }
    return null;
  } catch (error) {
    console.error("Error detecting face from image:", error);
    return null;
  }
}

export interface FaceDescriptorEntry {
  descriptor: Float32Array;
  createdAt: number;
  id?: string;
}

export interface RegisteredStudent {
  studentId: string;
  studentName: string;
  studentClass: string;
  studentNis: string;
  descriptors: FaceDescriptorEntry[];
}

// Store face descriptors in memory for quick comparison
let registeredStudents: RegisteredStudent[] = [];
let dataLoaded = false;

// Maximum descriptors per student
const MAX_DESCRIPTORS_PER_STUDENT = 10;

// Threshold for face matching (lower = stricter)
const MATCH_THRESHOLD = 0.6;

// Load registered faces from database
export async function loadRegisteredFaces(): Promise<RegisteredStudent[]> {
  try {
    // Fetch all face descriptors with student info
    const { data, error } = await supabase
      .from("face_descriptors")
      .select(`
        id,
        student_id,
        descriptor,
        created_at,
        students (name, nis, classes (name))
      `)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by student
    const studentMap = new Map<string, RegisteredStudent>();

    for (const row of data || []) {
      const studentId = row.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName: (row.students as any)?.name || "Unknown",
          studentClass: (row.students as any)?.classes?.name || "Unknown",
          studentNis: (row.students as any)?.nis || "",
          descriptors: [],
        });
      }

      const descriptorArray = row.descriptor as number[];
      studentMap.get(studentId)!.descriptors.push({
        descriptor: new Float32Array(descriptorArray),
        createdAt: new Date(row.created_at).getTime(),
        id: row.id,
      });
    }

    registeredStudents = Array.from(studentMap.values());
    dataLoaded = true;

    const totalDescriptors = registeredStudents.reduce((sum, s) => sum + s.descriptors.length, 0);
    console.log(`Loaded ${registeredStudents.length} students with ${totalDescriptors} total face descriptors from database`);
    
    // Migrate from localStorage if data exists there but not in DB
    await migrateFromLocalStorage();

    return registeredStudents;
  } catch (error) {
    console.error("Error loading registered faces:", error);
    return [];
  }
}

// One-time migration from localStorage to database
async function migrateFromLocalStorage(): Promise<void> {
  try {
    const stored = localStorage.getItem("face_descriptors_v2");
    if (!stored) return;

    const parsed = JSON.parse(stored);
    if (!parsed || parsed.length === 0) return;

    // Only migrate if DB is empty for those students
    const existingIds = new Set(registeredStudents.map(s => s.studentId));
    const toMigrate = parsed.filter((s: any) => !existingIds.has(s.studentId));

    if (toMigrate.length === 0) {
      // Already migrated, clean up localStorage
      localStorage.removeItem("face_descriptors_v2");
      localStorage.removeItem("face_descriptors");
      console.log("localStorage face data already migrated, cleaned up");
      return;
    }

    console.log(`Migrating ${toMigrate.length} students from localStorage to database...`);

    for (const student of toMigrate) {
      for (const entry of student.descriptors) {
        const descriptorArray = Array.from(entry.descriptor as number[]);
        await supabase.from("face_descriptors").insert({
          student_id: student.studentId,
          descriptor: descriptorArray,
        });
      }
    }

    // Clean up localStorage
    localStorage.removeItem("face_descriptors_v2");
    localStorage.removeItem("face_descriptors");
    console.log("Migration from localStorage complete");

    // Reload from DB
    await loadRegisteredFaces();
  } catch (error) {
    console.error("Error migrating from localStorage:", error);
  }
}

// Register a new face descriptor for a student
export async function registerFace(
  studentId: string,
  studentName: string,
  studentClass: string,
  studentNis: string,
  descriptor: Float32Array
): Promise<{ success: boolean; count: number }> {
  try {
    let student = registeredStudents.find(s => s.studentId === studentId);
    
    if (!student) {
      student = {
        studentId,
        studentName,
        studentClass,
        studentNis,
        descriptors: [],
      };
      registeredStudents.push(student);
    } else {
      student.studentName = studentName;
      student.studentClass = studentClass;
      student.studentNis = studentNis;
    }

    // If exceeded max, remove oldest descriptors from DB
    if (student.descriptors.length >= MAX_DESCRIPTORS_PER_STUDENT) {
      student.descriptors.sort((a, b) => a.createdAt - b.createdAt);
      const toRemove = student.descriptors.slice(0, student.descriptors.length - MAX_DESCRIPTORS_PER_STUDENT + 1);
      
      for (const entry of toRemove) {
        if (entry.id) {
          await supabase.from("face_descriptors").delete().eq("id", entry.id);
        }
      }
      student.descriptors = student.descriptors.slice(toRemove.length);
      console.log(`Removed ${toRemove.length} oldest descriptor(s) for ${studentName}`);
    }

    // Insert new descriptor to database
    const descriptorArray = Array.from(descriptor);
    const { data: inserted, error } = await supabase
      .from("face_descriptors")
      .insert({
        student_id: studentId,
        descriptor: descriptorArray,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;

    // Add to in-memory cache
    student.descriptors.push({
      descriptor,
      createdAt: new Date(inserted.created_at).getTime(),
      id: inserted.id,
    });

    // Update student's has_embedding flag
    await supabase
      .from("students")
      .update({ has_embedding: true })
      .eq("id", studentId);

    return { success: true, count: student.descriptors.length };
  } catch (error) {
    console.error("Error registering face:", error);
    return { success: false, count: 0 };
  }
}

// Get descriptor count for a student
export function getDescriptorCount(studentId: string): number {
  const student = registeredStudents.find(s => s.studentId === studentId);
  return student?.descriptors.length || 0;
}

// Find matching face
export function findMatchingFace(descriptor: Float32Array): RegisteredStudent | null {
  if (registeredStudents.length === 0) {
    console.log("No registered faces to compare");
    return null;
  }

  let bestMatch: RegisteredStudent | null = null;
  let bestDistance = Infinity;

  for (const student of registeredStudents) {
    for (const entry of student.descriptors) {
      const distance = faceapi.euclideanDistance(descriptor, entry.descriptor);
      
      if (distance < bestDistance && distance < MATCH_THRESHOLD) {
        bestDistance = distance;
        bestMatch = student;
      }
    }
  }

  if (bestMatch) {
    console.log(`Best match: ${bestMatch.studentName} with distance ${bestDistance.toFixed(4)}`);
  } else {
    console.log("No match found within threshold");
  }

  return bestMatch;
}

// Get all registered students
export function getRegisteredStudents(): RegisteredStudent[] {
  return registeredStudents;
}

// Remove all face registrations for a student
export async function removeFaceRegistration(studentId: string): Promise<boolean> {
  try {
    // Delete from database
    const { error } = await supabase
      .from("face_descriptors")
      .delete()
      .eq("student_id", studentId);

    if (error) throw error;

    // Remove from memory
    registeredStudents = registeredStudents.filter(s => s.studentId !== studentId);

    // Update has_embedding flag
    await supabase
      .from("students")
      .update({ has_embedding: false })
      .eq("id", studentId);

    return true;
  } catch (error) {
    console.error("Error removing face registration:", error);
    return false;
  }
}

// Clear all face registrations
export async function clearAllFaces(): Promise<void> {
  // Delete all from database
  const { error } = await supabase
    .from("face_descriptors")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

  if (error) {
    console.error("Error clearing all faces:", error);
  }

  registeredStudents = [];
  localStorage.removeItem("face_descriptors_v2");
  localStorage.removeItem("face_descriptors");
}

// Legacy compatibility
export interface RegisteredFace {
  studentId: string;
  studentName: string;
  studentClass: string;
  studentNis: string;
  descriptor: Float32Array;
}

export function getRegisteredFaces(): RegisteredFace[] {
  const faces: RegisteredFace[] = [];
  for (const student of registeredStudents) {
    if (student.descriptors.length > 0) {
      const latestDescriptor = student.descriptors[student.descriptors.length - 1];
      faces.push({
        studentId: student.studentId,
        studentName: student.studentName,
        studentClass: student.studentClass,
        studentNis: student.studentNis,
        descriptor: latestDescriptor.descriptor,
      });
    }
  }
  return faces;
}

// Check if data has been loaded from DB
export function isDataLoaded(): boolean {
  return dataLoaded;
}
