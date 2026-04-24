export type ShareResult = "shared" | "downloaded" | "unsupported";

export function downloadDocumentFile(file: File): boolean {
  if (typeof document === "undefined") return false;

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

export async function shareDocumentFile(
  file: File,
  title: string,
): Promise<ShareResult> {
  if (typeof navigator === "undefined") return "unsupported";

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title,
    });
    return "shared";
  }

  return downloadDocumentFile(file) ? "downloaded" : "unsupported";
}
