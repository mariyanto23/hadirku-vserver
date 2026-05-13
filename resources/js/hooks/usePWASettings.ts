import { useEffect, useRef, useState } from "react";
import { useSiteSettings, useSchoolSettings } from "@/hooks/useSettings";
import { generateMaskableIcon } from "@/lib/maskableIcon";

/**
 * Syncs PWA-related meta tags and dynamic manifest with admin settings:
 * - Document title
 * - Favicon
 * - Apple touch icon (uses school logo)
 * - Dynamic Web App Manifest (name, icons from settings)
 */
export function usePWASettings() {
  const { data: siteSettings } = useSiteSettings();
  const { data: schoolSettings } = useSchoolSettings();
  const manifestBlobUrl = useRef<string | null>(null);
  const [maskableIconUrl, setMaskableIconUrl] = useState<string | null>(null);

  // Generate padded maskable icon when school logo changes
  useEffect(() => {
    const logoUrl = schoolSettings?.schoolLogo;
    if (logoUrl) {
      generateMaskableIcon(logoUrl, 512)
        .then(setMaskableIconUrl)
        .catch(() => setMaskableIconUrl(null));
    } else {
      setMaskableIconUrl(null);
    }
  }, [schoolSettings?.schoolLogo]);

  // Sync document title
  useEffect(() => {
    if (siteSettings?.siteTitle) {
      document.title = siteSettings.siteTitle;
    }
  }, [siteSettings?.siteTitle]);

  // Sync favicon
  useEffect(() => {
    if (siteSettings?.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteSettings.favicon;
    }
  }, [siteSettings?.favicon]);

  // Sync apple-touch-icon with school logo
  useEffect(() => {
    const logoUrl = schoolSettings?.schoolLogo;
    if (logoUrl) {
      let link = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "apple-touch-icon";
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    }
  }, [schoolSettings?.schoolLogo]);

  // Dynamic manifest - updates PWA name and icon based on admin settings
  useEffect(() => {
    const appTitle = siteSettings?.appTitle || "Sistem Presensi";
    const appSubtitle = siteSettings?.appSubtitle || "SD N 01 Jatipurwo";
    const schoolLogo = schoolSettings?.schoolLogo;

    const icons = [];

    if (schoolLogo) {
      icons.push(
        { src: schoolLogo, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: schoolLogo, sizes: "512x512", type: "image/png", purpose: "any" },
      );
      // Use padded version for maskable icon
      if (maskableIconUrl) {
        icons.push({ src: maskableIconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" });
      } else {
        icons.push({ src: schoolLogo, sizes: "512x512", type: "image/png", purpose: "maskable" });
      }
    } else {
      icons.push(
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      );
    }

    const manifest = {
      name: appSubtitle,
      short_name: appTitle,
      description: appSubtitle,
      theme_color: "#2563eb",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      icons,
    };

    // Revoke previous blob URL
    if (manifestBlobUrl.current) {
      URL.revokeObjectURL(manifestBlobUrl.current);
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    manifestBlobUrl.current = url;

    let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = url;

    return () => {
      if (manifestBlobUrl.current) {
        URL.revokeObjectURL(manifestBlobUrl.current);
        manifestBlobUrl.current = null;
      }
    };
  }, [siteSettings?.appTitle, siteSettings?.appSubtitle, schoolSettings?.schoolLogo, maskableIconUrl]);

  return { siteSettings, schoolSettings };
}
