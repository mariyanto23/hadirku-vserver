import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage file path from a Supabase public URL or returns the path as-is.
 */
function extractStoragePath(photoUrl: string, bucket: string): string {
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const idx = photoUrl.indexOf(publicPrefix);
  if (idx !== -1) {
    return photoUrl.substring(idx + publicPrefix.length);
  }
  // Already a path
  return photoUrl;
}

/**
 * Hook to get a signed URL from a stored photo_url (supports both full public URLs and paths).
 */
export function useSignedUrl(
  photoUrl: string | null | undefined,
  bucket: string = "student-photos",
  expiresIn: number = 3600
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;

    const fetchUrl = async () => {
      try {
        const path = extractStoragePath(photoUrl, bucket);
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (!cancelled && data && !error) {
          setSignedUrl(data.signedUrl);
        }
      } catch {
        // Fallback: try original URL
        if (!cancelled) setSignedUrl(photoUrl);
      }
    };

    fetchUrl();
    return () => { cancelled = true; };
  }, [photoUrl, bucket, expiresIn]);

  return signedUrl;
}

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storageSrc: string | null | undefined;
  bucket?: string;
  fallback?: React.ReactNode;
}

/**
 * Image component that resolves signed URLs from Supabase storage paths/public URLs.
 */
export function SignedImage({ storageSrc, bucket = "student-photos", fallback, ...imgProps }: SignedImageProps) {
  const signedUrl = useSignedUrl(storageSrc, bucket);

  if (!storageSrc || !signedUrl) {
    return <>{fallback || null}</>;
  }

  return <img {...imgProps} src={signedUrl} />;
}
