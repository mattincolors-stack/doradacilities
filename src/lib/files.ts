export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function canShareFile(blob: Blob, filename: string): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  return navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] });
}

export async function shareFile(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return true;
    }
  }
  downloadBlob(blob, filename);
  return false;
}

/** Resize an image to max 800px on the longest side, as JPEG. */
export async function resizeImage(file: File, max = 800, quality = 0.85, type = "image/jpeg"): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar imagem"))), type, quality),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
