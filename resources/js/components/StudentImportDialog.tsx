import { useState, useRef } from "react";
import { FileUp, Download, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClassOption {
  id: string;
  name: string;
}

interface ParsedRow {
  nis: string;
  name: string;
  className: string;
  classId: string | null;
  error?: string;
}

interface StudentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  onImportComplete: () => void;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === "," || ch === ";") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

export function StudentImportDialog({ open, onOpenChange, classes, onImportComplete }: StudentImportDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchClass = (name: string): { id: string | null; matched: string } => {
    const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
    const found = classes.find(c => c.name.toLowerCase().replace(/\s+/g, " ").trim() === normalized);
    if (found) return { id: found.id, matched: found.name };
    // Try partial match e.g. "1" -> "Kelas 1"
    const numMatch = normalized.match(/(\d+)/);
    if (numMatch) {
      const found2 = classes.find(c => c.name.includes(numMatch[1]));
      if (found2) return { id: found2.id, matched: found2.name };
    }
    return { id: null, matched: name };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("File CSV kosong atau hanya berisi header");
        return;
      }

      // Detect columns from header
      const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, ""));
      let nisIdx = header.findIndex(h => ["nis", "nisn", "no", "nomor"].includes(h));
      let nameIdx = header.findIndex(h => ["nama", "name", "namalengkap", "namasiswa"].includes(h));
      let classIdx = header.findIndex(h => ["kelas", "class", "kelassiswa"].includes(h));

      // Fallback: assume NIS, Nama, Kelas order
      if (nisIdx === -1) nisIdx = 0;
      if (nameIdx === -1) nameIdx = 1;
      if (classIdx === -1) classIdx = 2;

      const dataRows = rows.slice(1);
      const parsed: ParsedRow[] = dataRows.map(row => {
        const nis = row[nisIdx] || "";
        const name = row[nameIdx] || "";
        const rawClass = row[classIdx] || "";
        const { id, matched } = matchClass(rawClass);

        let error: string | undefined;
        if (!nis) error = "NIS kosong";
        else if (!name) error = "Nama kosong";
        else if (!id) error = `Kelas "${rawClass}" tidak ditemukan`;

        return { nis, name, className: matched, classId: id, error };
      });

      setParsedRows(parsed);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const validRows = parsedRows.filter(r => !r.error);
  const errorRows = parsedRows.filter(r => r.error);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    // Batch insert in chunks of 50
    for (let i = 0; i < validRows.length; i += 50) {
      const chunk = validRows.slice(i, i + 50).map(r => ({
        nis: r.nis,
        name: r.name,
        class_id: r.classId!,
      }));

      const { error } = await supabase
        .from("students")
        .insert(chunk);

      if (error) {
        // Try one by one for this chunk
        for (const row of chunk) {
          const { error: singleError } = await supabase
            .from("students")
            .insert(row);
          if (singleError) {
            failed++;
            // Mark error on parsed row
            const found = parsedRows.find(r => r.nis === row.nis && !r.error);
            if (found) found.error = singleError.code === "23505" ? "NIS sudah terdaftar" : singleError.message;
          } else {
            success++;
          }
        }
      } else {
        success += chunk.length;
      }
    }

    setImportResult({ success, failed });
    setParsedRows([...parsedRows]); // trigger re-render with updated errors
    setIsImporting(false);

    if (success > 0) {
      toast.success(`${success} siswa berhasil diimport`);
      onImportComplete();
    }
    if (failed > 0) {
      toast.error(`${failed} siswa gagal diimport`);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setImportResult(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const header = "NIS,Nama,Kelas";
    const example = "12345,Ahmad Rizki,Kelas 1\n12346,Siti Nurhaliza,Kelas 2";
    const blob = new Blob([header + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_siswa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Data Siswa</DialogTitle>
          <DialogDescription>
            Upload file CSV dengan kolom: NIS, Nama, Kelas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Upload & Template */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <FileUp className="w-4 h-4" />
              Pilih File CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary">{parsedRows.length} baris</Badge>
                <Badge variant="default" className="bg-green-600">{validRows.length} valid</Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive">{errorRows.length} error</Badge>
                )}
              </div>

              <ScrollArea className="flex-1 border rounded-lg max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={row.error ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{row.nis}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.className}</TableCell>
                        <TableCell>
                          {row.error ? (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                              {row.error}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {importResult && (
            <div className="text-sm p-3 rounded-lg bg-muted">
              Hasil: <strong>{importResult.success}</strong> berhasil, <strong>{importResult.failed}</strong> gagal
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "Selesai" : "Batal"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  Import {validRows.length} Siswa
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
