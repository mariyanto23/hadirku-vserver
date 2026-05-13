import { useRef, useEffect, useCallback, useState } from "react";
import { Camera, Scan, User, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFaceDetection } from "@/hooks/useFaceDetection";

interface FaceCameraProps {
  isScanning: boolean;
  onFaceDetected?: (descriptor: Float32Array) => void;
  onFaceNotFound?: () => void;
}

export function FaceCamera({ isScanning, onFaceDetected, onFaceNotFound }: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [consecutiveDetections, setConsecutiveDetections] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));

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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Start/stop camera based on isScanning
  useEffect(() => {
    if (isScanning && isModelLoaded && videoRef.current) {
      startCamera(videoRef.current).then(() => {
        setCameraActive(true);
      });
    } else if (!isScanning) {
      stopCamera();
      setCameraActive(false);
      setConsecutiveDetections(0);
    }
  }, [isScanning, isModelLoaded, startCamera, stopCamera]);

  // Face detection loop
  useEffect(() => {
    if (!isScanning || !cameraActive || !isModelLoaded) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    const runDetection = async () => {
      const result = await detectFace();
      
      if (canvasRef.current) {
        drawDetection(canvasRef.current, result.detection);
      }

      if (result.detection && result.descriptor) {
        setConsecutiveDetections(prev => {
          const newCount = prev + 1;
          // Require 3 consecutive detections for stability
          if (newCount >= 3) {
            // Use setTimeout to avoid calling parent callback during render
            setTimeout(() => onFaceDetected?.(result.descriptor!), 0);
            return 0;
          }
          return newCount;
        });
      } else {
        setConsecutiveDetections(0);
      }
    };

    detectionIntervalRef.current = setInterval(runDetection, 200);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isScanning, cameraActive, isModelLoaded, detectFace, drawDetection, onFaceDetected, onFaceNotFound, consecutiveDetections]);

  // Loading state
  if (isLoading) {
    return (
      <div className="camera-container aspect-[4/3] w-full max-w-2xl mx-auto flex items-center justify-center bg-secondary rounded-xl">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin" />
          <div className="text-center">
            <p className="font-medium">Memuat Model Deteksi Wajah</p>
            <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="camera-container aspect-[4/3] w-full max-w-2xl mx-auto flex items-center justify-center bg-destructive/10 rounded-xl border-2 border-destructive/30">
        <div className="flex flex-col items-center gap-4 text-destructive p-6 text-center">
          <AlertCircle className="w-12 h-12" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "camera-container aspect-[4/3] w-full max-w-2xl mx-auto transition-smooth overflow-hidden rounded-xl relative",
      isScanning && cameraActive && "camera-active"
    )}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          !cameraActive && "hidden"
        )}
        style={{ transform: "scaleX(-1)" }} // Mirror the video
      />

      {/* Canvas overlay for face detection drawing */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 w-full h-full pointer-events-none",
          !cameraActive && "hidden"
        )}
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Placeholder when camera is not active */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
          {/* Face detection zone overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-2 border-primary/20 border-dashed rounded-3xl">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg" />
            </div>
          </div>

          {/* Center icon */}
          <div className="flex flex-col items-center gap-4 text-muted-foreground z-10">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <p className="text-sm font-medium">Posisikan wajah di dalam area</p>
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {isScanning && cameraActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scanning indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {!detectedFace && (
              <div className="flex flex-col items-center gap-3 text-white drop-shadow-lg">
                <Scan className="w-8 h-8 animate-pulse-soft" />
                <p className="text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  Mendeteksi wajah...
                </p>
              </div>
            )}
            {detectedFace && (
              <div className="flex flex-col items-center gap-3 text-success drop-shadow-lg">
                <p className="text-sm font-medium bg-black/50 px-3 py-1 rounded-full text-success">
                  Wajah terdeteksi! ({consecutiveDetections}/3)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera status indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <div className={cn(
          "w-3 h-3 rounded-full",
          cameraActive ? "bg-success animate-pulse" : "bg-muted-foreground"
        )} />
        <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded">
          {cameraActive ? "Kamera Aktif" : "Kamera Siap"}
        </span>
      </div>

      {/* Model status */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded flex items-center gap-1">
          <Camera className="w-3 h-3" />
          {isModelLoaded ? "AI Ready" : "Loading..."}
        </span>
      </div>

      {/* Timestamp */}
      <div className="absolute top-4 right-4 text-xs font-mono text-white bg-black/50 px-2 py-1 rounded z-10">
        {currentTime}
      </div>
    </div>
  );
}
