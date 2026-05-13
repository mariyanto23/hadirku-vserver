import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, CheckCircle, AlertCircle, User, Pencil, Search, X, ChevronLeft, ChevronRight, Camera, UserPlus, FileUp, Download, FileSpreadsheet, FileText, Users, CalendarDays, GraduationCap } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FaceRegistrationDialog } from "@/components/FaceRegistrationDialog";
import { getDescriptorCount, removeFaceRegistration, loadRegisteredFaces } from "@/services/faceRecognition";
import { CLASSES } from "@/lib/constants";
import { StudentImportDialog } from "@/components/StudentImportDialog";
import { AccountManagement } from "@/components/AccountManagement";
import { UserAccountsList } from "@/components/UserAccountsList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolidaySettings } from "@/components/HolidaySettings";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  classId: string | null;
  photo: string | null;
  hasEmbedding: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    nis: "",
    name: "",
    classId: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({
    nis: "",
    name: "",
    classId: "",
  });
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Face registration state
  const [faceRegStudent, setFaceRegStudent] = useState<{
    id: string;
    name: string;
    nis: string;
    className: string;
  } | null>(null);
  const [isFaceRegOpen, setIsFaceRegOpen] = useState(false);

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load face descriptors on mount
  useEffect(() => {
    loadRegisteredFaces();
  }, []);

  // Fetch classes and students from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Fetch students with class info
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          nis,
          name,
          photo_url,
          has_embedding,
          class_id,
          classes (name)
        `)
        .order("name");

      if (studentsError) throw studentsError;

      const mappedStudents: Student[] = (studentsData || []).map((s: any) => ({
        id: s.id,
        nis: s.nis,
        name: s.name,
        class: s.classes?.name || "Tidak ada kelas",
        classId: s.class_id,
        photo: s.photo_url,
        hasEmbedding: s.has_embedding,
      }));

      setStudents(mappedStudents);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered students
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchQuery === "" || 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === "all" || student.classId === classFilter;
    
    return matchesSearch && matchesClass;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleClassFilterChange = (value: string) => {
    setClassFilter(value);
    setCurrentPage(1);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File, studentId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Return file path for signed URL resolution
      return filePath;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nis || !formData.name || !formData.classId) {
      toast.error("Lengkapi semua data siswa");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Insert student
      const { data: newStudent, error: insertError } = await supabase
        .from("students")
        .insert({
          nis: formData.nis,
          name: formData.name,
          class_id: formData.classId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload photo if provided
      if (photoFile && newStudent) {
        const photoUrl = await uploadPhoto(photoFile, newStudent.id);
        if (photoUrl) {
          await supabase
            .from("students")
            .update({ photo_url: photoUrl })
            .eq("id", newStudent.id);
        }
      }

      setFormData({ nis: "", name: "", classId: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success("Siswa berhasil ditambahkan");
      fetchData();
    } catch (error: any) {
      console.error("Error adding student:", error);
      if (error.code === "23505") {
        toast.error("NIS sudah terdaftar");
      } else {
        toast.error("Gagal menambahkan siswa");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Remove face registration
      await removeFaceRegistration(id);

      toast.success("Siswa berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Gagal menghapus siswa");
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditFormData({
      nis: student.nis,
      name: student.name,
      classId: student.classId || "",
    });
    setEditPhotoPreview(student.photo);
    setEditPhotoFile(null);
    setIsEditDialogOpen(true);
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingStudent) return;
    
    if (!editFormData.nis || !editFormData.name || !editFormData.classId) {
      toast.error("Lengkapi semua data siswa");
      return;
    }

    setIsEditSubmitting(true);
    
    try {
      let photoUrl = editingStudent.photo;

      // Upload new photo if provided
      if (editPhotoFile) {
        const newPhotoUrl = await uploadPhoto(editPhotoFile, editingStudent.id);
        if (newPhotoUrl) {
          photoUrl = newPhotoUrl;
        }
      }

      // Update student
      const { error } = await supabase
        .from("students")
        .update({
          nis: editFormData.nis,
          name: editFormData.name,
          class_id: editFormData.classId,
          photo_url: photoUrl,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast.success("Data siswa berhasil diperbarui");
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating student:", error);
      if (error.code === "23505") {
        toast.error("NIS sudah terdaftar");
      } else {
        toast.error("Gagal memperbarui data siswa");
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleFaceRegClick = (student: Student) => {
    setFaceRegStudent({
      id: student.id,
      name: student.name,
      nis: student.nis,
      className: student.class,
    });
    setIsFaceRegOpen(true);
  };

  const handleFaceRegComplete = () => {
    fetchData();
  };

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    const dataToExport = filteredStudents.length > 0 ? filteredStudents : students;
    if (dataToExport.length === 0) {
      toast.error("Tidak ada data siswa untuk diekspor");
      return;
    }
    const rows = dataToExport.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      Nama: s.name,
      Kelas: s.class,
    }));

    if (type === "csv") {
      const headers = ["NIS", "Nama", "Kelas"];
      const csvRows = [
        headers.join(","),
        ...dataToExport.map(s => 
          [s.nis, `"${s.name.replace(/"/g, '""')}"`, `"${s.class}"`].join(",")
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `data-siswa-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${dataToExport.length} data siswa berhasil diekspor (CSV)`);
    } else if (type === "excel") {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Siswa");
      ws.columns = Object.keys(rows[0] || {}).map(key => ({ header: key, key }));
      rows.forEach(r => ws.addRow(r));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `data-siswa-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${dataToExport.length} data siswa berhasil diekspor (Excel)`);
    } else if (type === "pdf") {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Data Siswa", 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${dataToExport.length} siswa`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [["No", "NIS", "Nama", "Kelas"]],
        body: rows.map(r => [r.No, r.NIS, r.Nama, r.Kelas]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save(`data-siswa-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`${dataToExport.length} data siswa berhasil diekspor (PDF)`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5"><GraduationCap className="w-4 h-4" /> <span className="hidden sm:inline">Data Siswa</span></TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5"><Users className="w-4 h-4" /> <span className="hidden sm:inline">Akun Pengguna</span></TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1.5"><CalendarDays className="w-4 h-4" /> <span className="hidden sm:inline">Hari Libur</span></TabsTrigger>
        </TabsList>

        <TabsContent value="students">
      <div className="flex flex-col lg:flex-row gap-6">
        {isMobile && (
          <>
          {/* Mobile: merged into the card below */}
          </>
        )}
        {!isMobile && (
        <div className="w-full lg:w-[380px] lg:flex-shrink-0">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Tambah Siswa Baru</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo Upload */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-xs text-center px-2">Upload Foto</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Format: JPG, PNG (Max 2MB)</p>
              </div>

              {/* NIS */}
              <div className="space-y-2">
                <Label htmlFor="nis">NIS (Nomor Induk Siswa)</Label>
                <Input
                  id="nis"
                  placeholder="Masukkan NIS"
                  value={formData.nis}
                  onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Class */}
              <div className="space-y-2">
                <Label htmlFor="class">Kelas</Label>
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Siswa"}
              </Button>
              {/* Import Button */}
              <Button 
                type="button"
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setIsImportOpen(true)}
              >
                <FileUp className="w-4 h-4" />
                Import dari CSV
              </Button>
            </form>
          </div>
        </div>
        )}

        {/* Table Section */}
        <div className="w-full lg:flex-1 min-w-0">
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 md:p-6 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Daftar Siswa</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredStudents.length} dari {students.length} siswa
                  </span>
                  {isMobile && (
                    <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
                      <DrawerTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <UserPlus className="w-4 h-4" />
                          Tambah
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Tambah Siswa Baru</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
                          <form onSubmit={(e) => { handleSubmit(e); setIsAddDrawerOpen(false); }} className="space-y-5">
                            <div className="flex flex-col items-center">
                              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                                {photoPreview ? (
                                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center text-muted-foreground">
                                    <Upload className="w-6 h-6 mb-1" />
                                    <span className="text-xs">Foto</span>
                                  </div>
                                )}
                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nis-drawer">NIS</Label>
                              <Input id="nis-drawer" placeholder="Masukkan NIS" value={formData.nis} onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="name-drawer">Nama Lengkap</Label>
                              <Input id="name-drawer" placeholder="Masukkan nama lengkap" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="class-drawer">Kelas</Label>
                              <Select value={formData.classId} onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                  {classes.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting ? "Menyimpan..." : "Simpan Siswa"}
                            </Button>
                            <Button 
                              type="button"
                              variant="outline" 
                              className="w-full gap-2"
                              onClick={() => { setIsImportOpen(true); setIsAddDrawerOpen(false); }}
                            >
                              <FileUp className="w-4 h-4" />
                              Import dari CSV
                            </Button>
                          </form>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Export Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
                        <FileText className="w-4 h-4" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2">
                        <FileText className="w-4 h-4" />
                        Export CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau NIS..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleSearchChange("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Select value={classFilter} onValueChange={handleClassFilterChange}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-center">Face ID</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {students.length === 0 
                          ? "Belum ada data siswa" 
                          : "Tidak ada siswa yang cocok dengan pencarian"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {student.photo ? (
                              <SignedImage 
                                storageSrc={student.photo} 
                                alt={student.name}
                                className="w-full h-full object-cover"
                                fallback={<User className="w-5 h-5 text-muted-foreground" />}
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{student.nis}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell className="text-center">
                          {student.hasEmbedding ? (
                            <div className="inline-flex items-center gap-1.5 text-success">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Terdaftar ({getDescriptorCount(student.id)})</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-warning">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Belum</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-muted-foreground hover:text-primary"
                              title="Registrasi Wajah"
                              onClick={() => handleFaceRegClick(student)}
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-muted-foreground hover:text-primary"
                              title="Edit"
                              onClick={() => handleEditClick(student)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Siswa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Data siswa "{student.name}" akan dihapus permanen termasuk data wajah. Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(student.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} dari {filteredStudents.length} siswa
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <AccountManagement />
          <UserAccountsList />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaySettings />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Siswa</DialogTitle>
            <DialogDescription>
              Ubah data siswa {editingStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Photo Upload */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                {editPhotoPreview ? (
                  <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs">Foto</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleEditPhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nis">NIS</Label>
              <Input id="edit-nis" value={editFormData.nis} onChange={(e) => setEditFormData(prev => ({ ...prev, nis: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Lengkap</Label>
              <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class">Kelas</Label>
              <Select value={editFormData.classId} onValueChange={(value) => setEditFormData(prev => ({ ...prev, classId: value }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleEditSubmit} disabled={isEditSubmitting}>
              {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FaceRegistrationDialog
        open={isFaceRegOpen}
        onOpenChange={setIsFaceRegOpen}
        student={faceRegStudent}
        onRegistrationComplete={handleFaceRegComplete}
      />
      <StudentImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        classes={classes}
        onImportComplete={fetchData}
      />
    </div>
  );
};

export default Students;
