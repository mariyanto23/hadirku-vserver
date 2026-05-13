import { useState } from "react";
import { FileText, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function LeaveRequestsAdmin() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, students(name, nis, classes(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        student_name: r.students?.name || "-",
        student_nis: r.students?.nis || "-",
        student_class: r.students?.classes?.name || "-",
      }));
    },
  });

  const handleAction = async (id: string, actionStatus: "approved" | "rejected") => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: actionStatus, admin_note: adminNote || null })
        .eq("id", id);
      if (error) throw error;

      // When approved, upsert attendance_record with izin/sakit status
      if (actionStatus === "approved" && selectedRequest) {
        const leaveType = selectedRequest.leave_type as string; // "izin" or "sakit"
        const requestDate = selectedRequest.request_date;
        const { error: attError } = await supabase
          .from("attendance_records")
          .upsert({
            student_id: selectedRequest.student_id,
            date: requestDate,
            time: "00:00:00",
            status: leaveType,
          }, { onConflict: "student_id,date" });
        if (attError) console.error("Failed to sync attendance:", attError);
      }

      toast.success(actionStatus === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak");
      setSelectedRequest(null);
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-range"] });
    } catch (err: any) {
      console.error("Leave request action error:", err);
      toast.error("Gagal memproses pengajuan. Silakan coba lagi.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-success/10 text-success border-0 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Disetujui</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-0 gap-1 text-xs"><XCircle className="w-3 h-3" />Ditolak</Badge>;
      default: return <Badge className="bg-warning/10 text-warning border-0 gap-1 text-xs"><Clock className="w-3 h-3" />Menunggu</Badge>;
    }
  };

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Pengajuan Izin/Sakit
                {pendingCount > 0 && (
                  <Badge className="bg-warning/10 text-warning border-0 text-xs">{pendingCount} menunggu</Badge>
                )}
              </CardTitle>
              <CardDescription>Kelola pengajuan izin dan sakit siswa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada pengajuan.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-sm">{format(new Date(req.request_date), "d MMM yyyy", { locale: localeId })}</TableCell>
                      <TableCell className="font-medium">{req.student_name}</TableCell>
                      <TableCell className="text-sm">{req.student_class}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{req.leave_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>
                        {req.status === "pending" ? (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(req); setAdminNote(""); }}>
                            Tinjau
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tinjau Pengajuan</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Siswa:</span> <span className="font-medium">{selectedRequest.student_name}</span></div>
                <div><span className="text-muted-foreground">Kelas:</span> <span className="font-medium">{selectedRequest.student_class}</span></div>
                <div><span className="text-muted-foreground">Jenis:</span> <Badge variant="outline" className="text-xs capitalize ml-1">{selectedRequest.leave_type}</Badge></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{format(new Date(selectedRequest.request_date), "d MMM yyyy", { locale: localeId })}</span></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Alasan:</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRequest.reason}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Catatan Admin (opsional):</p>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Tambahkan catatan..."
                  maxLength={500}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleAction(selectedRequest.id, "rejected")}
              disabled={isUpdating}
              className="gap-1"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Tolak
            </Button>
            <Button
              onClick={() => selectedRequest && handleAction(selectedRequest.id, "approved")}
              disabled={isUpdating}
              className="gap-1"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
