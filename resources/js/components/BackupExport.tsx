import { useState } from "react";
import { Database, Download, Loader2, FileJson, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const INCLUDED_TABLES = [
  "Kelas",
  "Data Siswa",
  "Wajah Terdaftar",
  "Presensi",
  "Izin & Sakit",
  "Hari Libur",
  "Relasi Orang Tua",
  "Relasi Siswa",
  "Peran Pengguna",
  "Pengaturan Aplikasi",
];

type Format = "json" | "sql";

export function BackupExport() {
  const [exporting, setExporting] = useState<Format | null>(null);

  const handleExport = async (format: Format) => {
    setExporting(format);
    const toastId = toast.loading(
      `Membuat full dump (${format.toUpperCase()})...`,
      { duration: Infinity },
    );

    try {
      const url = `/api/admin/backup?format=${format}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const totalRows = Number(res.headers.get("X-Total-Rows") || 0);
      const tableCount = Number(res.headers.get("X-Table-Count") || 0);

      const blob = await res.blob();
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
      const ext = format === "sql" ? "sql" : "json";
      const filename = `full-dump-presensi-${dateStr}-${timeStr}.${ext}`;

      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objUrl);

      // For JSON, headers aren't set — read from blob meta if needed
      let summary = "";
      if (format === "sql" && totalRows) {
        summary = ` (${tableCount} tabel, ${totalRows.toLocaleString("id-ID")} baris)`;
      } else if (format === "json") {
        try {
          const text = await blob.text();
          const json = JSON.parse(text);
          const tc = json?.meta?.table_count ?? 0;
          const tr = json?.meta?.total_rows ?? 0;
          summary = ` (${tc} tabel, ${tr.toLocaleString("id-ID")} baris)`;
        } catch {
          // ignore
        }
      }

      toast.success(`Backup ${format.toUpperCase()} berhasil${summary}`, {
        id: toastId,
        duration: 10000,
        closeButton: true,
      });
    } catch (err) {
      console.error("Backup error:", err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(`Gagal membuat backup: ${message}`, {
        id: toastId,
        duration: 10000,
        closeButton: true,
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Backup Database</CardTitle>
            <CardDescription>
              Unduh full database dump dalam format JSON atau SQL
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">Tabel yang diekspor (full dump):</p>
          <ul className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
            {INCLUDED_TABLES.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Format JSON</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Snapshot terstruktur. Cocok untuk arsip & migrasi via aplikasi.
            </p>
            <Button
              onClick={() => handleExport("json")}
              disabled={exporting !== null}
              size="sm"
              variant="outline"
              className="gap-2 w-full"
            >
              {exporting === "json" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Unduh JSON
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Format SQL</p>
            </div>
            <p className="text-xs text-muted-foreground">
              CREATE TABLE + INSERT. Bisa di-restore via{" "}
              <code className="text-[10px]">psql -f</code>.
            </p>
            <Button
              onClick={() => handleExport("sql")}
              disabled={exporting !== null}
              size="sm"
              className="gap-2 w-full"
            >
              {exporting === "sql" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Unduh SQL
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Backup tidak menyertakan data autentikasi (password, session) karena
          dikelola terpisah oleh sistem dan sudah di-backup harian secara
          otomatis. Disarankan ekspor manual mingguan/bulanan.
        </p>
      </CardContent>
    </Card>
  );
}
