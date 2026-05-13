/**
 * Generates a maskable icon with safe-zone padding from a source image URL.
 * Maskable icons require ~10% padding on each side (80% safe zone).
 * We use ~15% padding for extra safety across all devices.
 */
export function generateMaskableIcon(
  sourceUrl: string,
  size: number = 512
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Fill background white
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // 15% padding on each side → logo occupies 70% of canvas
      const padding = Math.round(size * 0.15);
      const drawSize = size - padding * 2;

      // Center the image, maintaining aspect ratio
      const aspect = img.width / img.height;
      let dw: number, dh: number;
      if (aspect > 1) {
        dw = drawSize;
        dh = drawSize / aspect;
      } else {
        dh = drawSize;
        dw = drawSize * aspect;
      }
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = sourceUrl;
  });
}
