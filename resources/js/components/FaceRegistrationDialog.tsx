import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, Loader2, CheckCircle, User, AlertCircle, Upload, ImageIcon, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { registerFace, getDescriptorCount, detectFaceFromImage } from "@/services/faceRecognition";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { playSuccessSound, playErrorSound } from "@/lib/audio";

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    nis: string;
    className: string;
  } | null;
  onRegistrationComplete?: () => void;
}

const MAX_DESCRIPTORS = 10;

export function FaceRegistrationDialog({
  open,
  onOpenChange,
  student,
  onRegistrationComplete,
}: FaceRegistrationDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [existingCount, setExistingCount] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isModelLoaded,
    isLoading,
    error,
    detectedFace,
    startCamera,
    stopCamera,
    detectFace,
    drawDetection,
  } = useFaceDetection();

  // Load existing descriptor count when dialog opens
  useEffect(() => {
    if (open && student) {
      const count = getDescriptorCount(student.id);
      setExistingCount(count);
      setCapturedCount(0);
      setUploadedImage(null);
    }
  }, [open, student]);

  // Cleanup when dialog closes or tab changes
  useEffect(() => {
    return () => {
      if (!open || activeTab !== "camera") {
        stopCamera();
        setCameraActive(false);
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      }
    };
  }, [open, activeTab, stopCamera]);

  // Face detection loop for preview
  useEffect(() => {
    if (!open || activeTab !== "camera" || !cameraActive || !isModelLoaded || isCapturing) {
      return;
    }

    const runDetection = async () => {
      const result = await detectFace();
      if (canvasRef.current) {
        drawDetection(canvasRef.current, result.detection);
      }
    };

    detectionIntervalRef.current = setInterval(runDetection, 150);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [open, activeTab, cameraActive, isModelLoaded, isCapturing, detectFace, drawDetection]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    if (value === "upload") {
      stopCamera();
      setCameraActive(false);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
    setActiveTab(value as "camera" | "upload");
  };

  // Toggle camera on/off
  const handleToggleCamera = useCallback(async () => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    } else {
      if (videoRef.current && isModelLoaded) {
        await startCamera(videoRef.current);
        setCameraActive(true);
      }
    }
  }, [cameraActive, isModelLoaded, startCamera, stopCamera]);

  const handleCapture = useCallback(async () => {
    if (!student || isCapturing) return;

    setIsCapturing(true);

    try {
      const result = await detectFace();

      if (!result.detection || !result.descriptor) {
        playErrorSound();
        toast.error("Wajah tidak terdeteksi. Pastikan wajah terlihat jelas.");
        setIsCapturing(false);
        return;
      }

      const { success, count } = await registerFace(
        student.id,
        student.name,
        student.className,
        student.nis,
        result.descriptor
      );

      if (success) {
        playSuccessSound();
        setCapturedCount(prev => prev + 1);
        setExistingCount(count);
        toast.success(`Data wajah ke-${count} berhasil disimpan`);
      } else {
        playErrorSound();
        toast.error("Gagal menyimpan data wajah");
      }
    } catch (err) {
      console.error("Error capturing face:", err);
      playErrorSound();
      toast.error("Terjadi kesalahan saat menangkap wajah");
    }

    setIsCapturing(false);
  }, [student, isCapturing, detectFace]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleProcessUpload = useCallback(async () => {
    if (!student || !uploadedImage || isProcessingUpload) return;

    setIsProcessingUpload(true);

    try {
      // Create image element
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = uploadedImage;
      });

      // Detect face from image
      const descriptor = await detectFaceFromImage(img);

      if (!descriptor) {
        playErrorSound();
        toast.error("Wajah tidak terdeteksi dalam foto. Pastikan wajah terlihat jelas.");
        setIsProcessingUpload(false);
        return;
      }

      const { success, count } = await registerFace(
        student.id,
        student.name,
        student.className,
        student.nis,
        descriptor
      );

      if (success) {
        playSuccessSound();
        setCapturedCount(prev => prev + 1);
        setExistingCount(count);
        toast.success(`Data wajah ke-${count} berhasil disimpan dari foto`);
        setUploadedImage(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        playErrorSound();
        toast.error("Gagal menyimpan data wajah");
      }
    } catch (err) {
      console.error("Error processing uploaded image:", err);
      playErrorSound();
      toast.error("Terjadi kesalahan saat memproses foto");
    }

    setIsProcessingUpload(false);
  }, [student, uploadedImage, isProcessingUpload]);

  const handleClose = () => {
    stopCamera();
    setCameraActive(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setUploadedImage(null);
    onOpenChange(false);
    if (capturedCount > 0) {
      onRegistrationComplete?.();
    }
  };

  const totalDescriptors = existingCount;
  const progressPercentage = (totalDescriptors / MAX_DESCRIPTORS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Registrasi Wajah
          </DialogTitle>
          <DialogDescription>
            {student ? `Tambahkan data wajah untuk ${student.name}` : "Pilih siswa terlebih dahulu"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Wajah Tersimpan</span>
              <span className="font-medium">{totalDescriptors} / {MAX_DESCRIPTORS}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {totalDescriptors >= MAX_DESCRIPTORS && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Maksimum tercapai. Data baru akan mengganti data lama.
              </p>
            )}
          </div>

          {/* Tabs for Camera / Upload */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera" className="gap-2">
                <Camera className="w-4 h-4" />
                Kamera
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Foto
              </TabsTrigger>
            </TabsList>

            {/* Camera Tab */}
            <TabsContent value="camera" className="mt-4">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-start">
                <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Memuat model AI...</p>
                    </div>
                  ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-destructive p-4 text-center">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-sm">{error}</p>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover",
                          !cameraActive && "hidden"
                        )}
                        style={{ transform: "scaleX(-1)" }}
                      />
                      <canvas
                        ref={canvasRef}
                        className={cn(
                          "absolute inset-0 w-full h-full pointer-events-none",
                          !cameraActive && "hidden"
                        )}
                        style={{ transform: "scaleX(-1)" }}
                      />

                      {!cameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                          <VideoOff className="w-12 h-12" />
                          <p className="text-sm">Kamera tidak aktif</p>
                          <p className="text-xs">Klik tombol di bawah untuk memulai</p>
                        </div>
                      )}

                      {/* Face detection indicator */}
                      {cameraActive && (
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            detectedFace ? "bg-success animate-pulse" : "bg-warning"
                          )} />
                          {detectedFace ? "Wajah terdeteksi" : "Mencari wajah..."}
                        </div>
                      )}

                      {/* Capturing indicator */}
                      {isCapturing && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="font-medium">Menyimpan...</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Camera Control Buttons */}
                <div className="flex flex-row md:flex-col gap-3">
                  <Button
                    variant={cameraActive ? "destructive" : "secondary"}
                    className="flex-1 md:w-full"
                    onClick={handleToggleCamera}
                    disabled={isLoading || !!error}
                  >
                    {cameraActive ? (
                      <>
                        <VideoOff className="w-4 h-4 mr-2" />
                        Berhenti
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Mulai Kamera
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 md:w-full"
                    onClick={handleCapture}
                    disabled={!cameraActive || isCapturing || !detectedFace}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isCapturing ? "Menyimpan..." : "Ambil Foto"}
                  </Button>
                  <div className="hidden md:block text-xs text-muted-foreground leading-relaxed pt-2">
                    Pastikan wajah terlihat jelas dan pencahayaan cukup. Ambil beberapa foto dari sudut yang berbeda untuk akurasi maksimal.
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-start">
                {/* Upload Area */}
                <div 
                  className={cn(
                    "relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border transition-colors",
                    !uploadedImage && "hover:border-primary/50 cursor-pointer"
                  )}
                  onClick={() => !uploadedImage && fileInputRef.current?.click()}
                >
                  {uploadedImage ? (
                    <>
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded preview" 
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {isProcessingUpload && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="font-medium">Memproses...</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <ImageIcon className="w-12 h-12" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Klik untuk upload foto</p>
                        <p className="text-xs">atau drag & drop file di sini</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <Button
                    className="w-full"
                    onClick={handleProcessUpload}
                    disabled={!uploadedImage || isProcessingUpload}
                  >
                    {isProcessingUpload ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Simpan Wajah dari Foto
                      </>
                    )}
                  </Button>
                  <div className="hidden md:block text-xs text-muted-foreground leading-relaxed">
                    Format: JPG/PNG, maksimal 5MB. Gunakan foto dengan wajah menghadap depan dan pencahayaan terang.
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Captured this session */}
          {capturedCount > 0 && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>{capturedCount} wajah baru ditambahkan sesi ini</span>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Pastikan wajah terlihat jelas dan menghadap kamera</li>
              <li>Ambil foto dari berbagai sudut untuk akurasi lebih baik</li>
              <li>Hindari pencahayaan yang terlalu terang atau gelap</li>
              <li>Maksimal 10 data wajah per siswa</li>
            </ul>
          </div>

          {/* Close Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
          >
            <X className="w-4 h-4 mr-2" />
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
