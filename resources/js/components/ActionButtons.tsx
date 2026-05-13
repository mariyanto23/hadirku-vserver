import { Camera, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onReset: () => void;
}

export function ActionButtons({ 
  isScanning, 
  onStartScan, 
  onStopScan,
  onReset 
}: ActionButtonsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {!isScanning ? (
        <Button 
          onClick={onStartScan}
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-8"
        >
          <Camera className="w-5 h-5" />
          Mulai Scan
        </Button>
      ) : (
        <Button 
          onClick={onStopScan}
          size="lg"
          variant="destructive"
          className="gap-2 px-8"
        >
          <Camera className="w-5 h-5" />
          Berhenti
        </Button>
      )}
      
      <Button 
        onClick={onReset}
        size="lg"
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reset
      </Button>

    </div>
  );
}
