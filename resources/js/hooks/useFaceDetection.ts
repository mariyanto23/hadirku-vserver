import { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";

export interface FaceDetectionState {
  isModelLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  detectedFace: faceapi.FaceDetection | null;
  faceDescriptor: Float32Array | null;
}

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export function useFaceDetection() {
  const [state, setState] = useState<FaceDetectionState>({
    isModelLoaded: false,
    isLoading: true,
    error: null,
    detectedFace: null,
    faceDescriptor: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setState(prev => ({ ...prev, isModelLoaded: true, isLoading: false }));
      console.log("Face detection models loaded successfully");
    } catch (error) {
      console.error("Error loading face detection models:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Gagal memuat model deteksi wajah. Periksa koneksi internet.",
      }));
    }
  }, []);

  // Initialize models on mount
  useEffect(() => {
    loadModels();
    return () => {
      stopCamera();
    };
  }, [loadModels]);

  // Start webcam
  const startCamera = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      if (streamRef.current) {
        return; // Already running
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      videoElement.srcObject = stream;
      streamRef.current = stream;
      videoRef.current = videoElement;

      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });

      console.log("Camera started successfully");
    } catch (error) {
      console.error("Error starting camera:", error);
      setState(prev => ({
        ...prev,
        error: "Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.",
      }));
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    setState(prev => ({ ...prev, detectedFace: null, faceDescriptor: null }));
    console.log("Camera stopped");
  }, []);

  // Detect face and get descriptor
  const detectFace = useCallback(async (): Promise<{
    detection: faceapi.FaceDetection | null;
    descriptor: Float32Array | null;
  }> => {
    if (!videoRef.current || !state.isModelLoaded) {
      return { detection: null, descriptor: null };
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setState(prev => ({
          ...prev,
          detectedFace: detection.detection,
          faceDescriptor: detection.descriptor,
        }));
        return {
          detection: detection.detection,
          descriptor: detection.descriptor,
        };
      }

      setState(prev => ({ ...prev, detectedFace: null, faceDescriptor: null }));
      return { detection: null, descriptor: null };
    } catch (error) {
      console.error("Error detecting face:", error);
      return { detection: null, descriptor: null };
    }
  }, [state.isModelLoaded]);

  // Draw detection on canvas
  const drawDetection = useCallback((canvas: HTMLCanvasElement, detection: faceapi.FaceDetection | null) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !videoRef.current) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      const box = detection.box;
      
      // Draw face box
      ctx.strokeStyle = "hsl(142, 76%, 36%)"; // Success color
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw corner markers
      const cornerSize = 20;
      ctx.strokeStyle = "hsl(142, 76%, 36%)";
      ctx.lineWidth = 4;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + cornerSize);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + cornerSize, box.y);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + cornerSize);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - cornerSize);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + cornerSize, box.y + box.height);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
      ctx.stroke();
    }
  }, []);

  // Compare face descriptors
  const compareFaces = useCallback((descriptor1: Float32Array, descriptor2: Float32Array): number => {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
  }, []);

  return {
    ...state,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    detectFace,
    drawDetection,
    compareFaces,
    loadModels,
  };
}
