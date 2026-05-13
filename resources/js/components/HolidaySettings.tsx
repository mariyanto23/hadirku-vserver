import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, Plus, Trash2, Loader2, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useHolidays, useCreateHoliday, useDeleteHoliday, useUpdateHoliday, Holiday } from "@/hooks/useHolidays";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Daftar Libur Nasional Indonesia 2026
// Tanggal yang bersifat tetap setiap tahun ditandai recurring
const INDONESIA_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Tahun Baru Masehi", is_recurring: true },
  { date: "2026-01-29", name: "Tahun Baru Imlek 2577", is_recurring: false },
  { date: "2026-02-17", name: "Isra Mi'raj Nabi Muhammad SAW", is_recurring: false },
  { date: "2026-03-22", name: "Hari Raya Nyepi (Tahun Baru Saka 1948)", is_recurring: false },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri 1447 H (Hari 1)", is_recurring: false },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H (Hari 2)", is_recurring: false },
  { date: "2026-04-03", name: "Wafat Isa Al Masih (Jumat Agung)", is_recurring: false },
  { date: "2026-05-01", name: "Hari Buruh Internasional", is_recurring: true },
  { date: "2026-05-14", name: "Kenaikan Isa Al Masih", is_recurring: false },
  { date: "2026-05-16", name: "Hari Raya Waisak 2570", is_recurring: false },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", is_recurring: false },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", is_recurring: true },
  { date: "2026-06-17", name: "Tahun Baru Islam 1448 H", is_recurring: false },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI", is_recurring: true },
  { date: "2026-08-26", name: "Maulid Nabi Muhammad SAW", is_recurring: false },
  { date: "2026-12-25", name: "Hari Raya Natal", is_recurring: true },
];

export function HolidaySettings() {
  const { data: holidays, isLoading } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const updateHoliday = useUpdateHoliday();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const handleAdd = async () => {
    if (!name || !date) return;
    await createHoliday.mutateAsync({ date, name, description, is_recurring: isRecurring });
    setName("");
    setDate("");
    setDescription("");
    setIsRecurring(false);
    setOpen(false);
  };

  const existingDates = new Set((holidays || []).map(h => h.date));
  const importableHolidays = INDONESIA_HOLIDAYS_2026.filter(h => !existingDates.has(h.date));

  const handleImport = async () => {
    if (importableHolidays.length === 0) return;
    setImporting(true);
    try {
      const { error } = await supabase
        .from("holidays" as any)
        .insert(importableHolidays.map(h => ({ date: h.date, name: h.name, is_recurring: h.is_recurring, description: "" })) as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success(`${importableHolidays.length} hari libur nasional berhasil diimpor`);
      setImportOpen(false);
    } catch (err: any) {
      toast.error("Gagal mengimpor: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const upcomingHolidays = (holidays || []).filter(h => {
    const hDate = new Date(h.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return hDate >= today || h.is_recurring;
  });

  const pastHolidays = (holidays || []).filter(h => {
    const hDate = new Date(h.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return hDate < today && !h.is_recurring;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Hari Libur</CardTitle>
              <CardDescription>Kelola libur nasional dan hari libur sekolah</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Import button */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Impor Libur</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Impor Libur Nasional Indonesia 2026</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {importableHolidays.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Semua libur nasional sudah ditambahkan</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {importableHolidays.length} hari libur akan ditambahkan:
                      </p>
                      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                        {importableHolidays.map(h => (
                          <div key={h.date} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                            <div>
                              <p className="text-sm font-medium">{h.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(h.date), "dd MMMM yyyy", { locale: localeId })}
                              </p>
                            </div>
                            {h.is_recurring && <Badge variant="secondary" className="text-xs shrink-0">Tahunan</Badge>}
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleImport} disabled={importing} className="w-full gap-2">
                        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                        Impor {importableHolidays.length} Hari Libur
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add manual button */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Hari Libur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Hari Libur</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Hari Kemerdekaan" />
                  </div>
                  <div className="space-y-2">
                    <Label>Keterangan (opsional)</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan tambahan" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Berulang Setiap Tahun</p>
                      <p className="text-xs text-muted-foreground">Otomatis aktif di tanggal yang sama setiap tahun</p>
                    </div>
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  </div>
                  <Button onClick={handleAdd} disabled={!name || !date || createHoliday.isPending} className="w-full gap-2">
                    {createHoliday.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (holidays || []).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada hari libur yang ditambahkan</p>
            <p className="text-xs mt-1">Klik "Impor Libur" untuk menambahkan libur nasional Indonesia 2026</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingHolidays.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mendatang / Berulang</p>
                {upcomingHolidays.map(h => (
                  <HolidayItem key={h.id} holiday={h} onDelete={() => deleteHoliday.mutate(h.id)} deleting={deleteHoliday.isPending} onUpdate={updateHoliday} />
                ))}
              </div>
            )}
            {pastHolidays.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sudah Lewat</p>
                  {pastHolidays.map(h => (
                    <HolidayItem key={h.id} holiday={h} onDelete={() => deleteHoliday.mutate(h.id)} deleting={deleteHoliday.isPending} onUpdate={updateHoliday} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HolidayItem({ holiday, onDelete, deleting, onUpdate }: { holiday: Holiday; onDelete: () => void; deleting: boolean; onUpdate: ReturnType<typeof useUpdateHoliday> }) {
  const dateFormatted = format(new Date(holiday.date), "dd MMMM yyyy", { locale: localeId });
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(holiday.name);
  const [editDate, setEditDate] = useState(holiday.date);
  const [editDescription, setEditDescription] = useState(holiday.description || "");
  const [editRecurring, setEditRecurring] = useState(holiday.is_recurring);

  const handleSave = async () => {
    if (!editName || !editDate) return;
    await onUpdate.mutateAsync({
      id: holiday.id,
      name: editName,
      date: editDate,
      description: editDescription,
      is_recurring: editRecurring,
    });
    setEditOpen(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{holiday.name}</p>
          {holiday.is_recurring && (
            <Badge variant="secondary" className="text-xs shrink-0">Tahunan</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{dateFormatted}</p>
        {holiday.description && <p className="text-xs text-muted-foreground mt-0.5">{holiday.description}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Pencil className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Hari Libur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nama Hari Libur</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Contoh: Hari Kemerdekaan" />
              </div>
              <div className="space-y-2">
                <Label>Keterangan (opsional)</Label>
                <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Keterangan tambahan" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Berulang Setiap Tahun</p>
                  <p className="text-xs text-muted-foreground">Otomatis aktif di tanggal yang sama setiap tahun</p>
                </div>
                <Switch checked={editRecurring} onCheckedChange={setEditRecurring} />
              </div>
              <Button onClick={handleSave} disabled={!editName || !editDate || onUpdate.isPending} className="w-full gap-2">
                {onUpdate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete} disabled={deleting}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
