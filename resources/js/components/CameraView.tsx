import { Camera, Scan, User } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CameraViewProps {
  isScanning: boolean;
  onCapture?: () => void;
}

export function CameraView({ isScanning, onCapture }: CameraViewProps) {
  const [showScanLine, setShowScanLine] = useState(false);

  useEffect(() => {
    if (isScanning) {
      setShowScanLine(true);
    } else {
      setShowScanLine(false);
    }
  }, [isScanning]);

  return (
    <div 
      className={cn(
        "camera-container aspect-[3/4] sm:aspect-[4/3] w-full max-w-2xl mx-auto flex items-center justify-center transition-smooth",
        isScanning && "camera-active"
      )}
    >
      {/* Camera placeholder - would be replaced with actual camera feed */}
        <div className={cn(
          "relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out",
          isScanning 
            ? "bg-gradient-to-br from-accent/5 to-accent/15" 
            : "bg-gradient-to-br from-primary/5 to-primary/10"
        )}>
        
        {/* Face detection zone overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "w-48 h-60 border-2 rounded-3xl transition-all duration-700 ease-out",
            isScanning 
              ? "border-accent shadow-[0_0_30px_hsl(var(--accent)/0.3)] scale-105" 
              : "border-primary/20 border-dashed scale-100"
          )}>
            {/* Corner markers */}
            <div className={cn("absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg transition-all duration-500", isScanning ? "opacity-100 -translate-x-0.5 -translate-y-0.5" : "opacity-40")} />
            <div className={cn("absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg transition-all duration-500", isScanning ? "opacity-100 translate-x-0.5 -translate-y-0.5" : "opacity-40")} />
            <div className={cn("absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg transition-all duration-500", isScanning ? "opacity-100 -translate-x-0.5 translate-y-0.5" : "opacity-40")} />
            <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg transition-all duration-500", isScanning ? "opacity-100 translate-x-0.5 translate-y-0.5" : "opacity-40")} />
            
            {/* Scan line animation */}
            {showScanLine && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent animate-scan-line" />
            )}
          </div>
        </div>

        {/* Center icon */}
        <div className={cn(
          "flex flex-col items-center gap-4 transition-all duration-500",
          isScanning ? "opacity-0 scale-90" : "opacity-100 scale-100"
        )}>
          {!isScanning && (
            <>
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Posisikan wajah di dalam area</p>
            </>
          )}
        </div>
        
        <div className={cn(
          "absolute flex flex-col items-center gap-3 text-accent transition-all duration-500",
          isScanning ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}>
          <Scan className="w-8 h-8 animate-pulse-soft" />
          <p className="text-sm font-medium">Mendeteksi wajah...</p>
        </div>

        {/* Camera status indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isScanning ? "bg-success animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-xs font-medium text-muted-foreground">
            {isScanning ? "Kamera Aktif" : "Kamera Siap"}
          </span>
        </div>

        {/* Timestamp */}
        <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {new Date().toLocaleTimeString('id-ID')}
        </div>
      </div>
    </div>
  );
}
