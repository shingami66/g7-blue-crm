/**
 * Browser-side mobile receipt camera helpers for W5B-1B Expense Self-Service.
 *
 * Responsibilities:
 * - Feature detection for getUserMedia and MediaDevices
 * - Stream lifecycle management (rear-facing environment camera, audio: false)
 * - Safe track cleanup (no stream leaks)
 * - Client-side image scaling and canvas-based JPEG normalization (max 1920px long edge, quality 0.85)
 * - Safe timestamped filename generation without personal identifiers
 * - Allowed receipt file verification (PDF, JPEG, PNG, size <= 25MB, HEIC rejection)
 */

export const CAMERA_CONFIG = {
  maxLongEdge: 1920,
  jpegQuality: 0.85,
  facingMode: { ideal: "environment" },
  audio: false,
} as const;

export function isGetUserMediaSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function isCameraAvailable(): boolean {
  if (!isGetUserMediaSupported()) {
    return false;
  }
  if (typeof window !== "undefined" && "isSecureContext" in window) {
    if (!window.isSecureContext) {
      return false;
    }
  }
  return true;
}

export async function startRearCameraStream(): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw new Error("getUserMedia is not supported on this browser");
  }

  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: CAMERA_CONFIG.facingMode,
    },
    audio: CAMERA_CONFIG.audio,
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  } catch {
    // Graceful swallow of already stopped or inaccessible tracks
  }
}

export function calculateScaledDimensions(
  origWidth: number,
  origHeight: number,
  maxLongEdge: number = CAMERA_CONFIG.maxLongEdge
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const longEdge = Math.max(origWidth, origHeight);
  if (longEdge <= maxLongEdge) {
    return { width: Math.round(origWidth), height: Math.round(origHeight) };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(origWidth * scale),
    height: Math.round(origHeight * scale),
  };
}

export function generateReceiptCameraFilename(date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `receipt-camera-${yyyy}${mm}${dd}-${hh}${min}${ss}.jpg`;
}

export async function captureVideoFrameToBlob(
  video: HTMLVideoElement,
  options?: { maxLongEdge?: number; quality?: number }
): Promise<Blob> {
  const origWidth = video.videoWidth;
  const origHeight = video.videoHeight;

  if (!origWidth || !origHeight) {
    throw new Error("Video frame is not yet available");
  }

  const maxLongEdge = options?.maxLongEdge ?? CAMERA_CONFIG.maxLongEdge;
  const quality = options?.quality ?? CAMERA_CONFIG.jpegQuality;

  const { width, height } = calculateScaledDimensions(origWidth, origHeight, maxLongEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context");
  }

  ctx.drawImage(video, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas conversion to JPEG blob failed"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

export async function captureVideoFrameToFile(
  video: HTMLVideoElement,
  options?: { maxLongEdge?: number; quality?: number; filename?: string }
): Promise<File> {
  const blob = await captureVideoFrameToBlob(video, options);
  const filename = options?.filename ?? generateReceiptCameraFilename();
  return new File([blob], filename, { type: "image/jpeg" });
}

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export function isAllowedReceiptFile(file: File): {
  valid: boolean;
  error?: "unsupported_type" | "oversized" | "heic_detected";
} {
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: "oversized" };
  }

  const nameLower = file.name.toLowerCase();
  const typeLower = file.type.toLowerCase();

  // Explicitly detect HEIC/HEIF
  if (
    typeLower.includes("heic") ||
    typeLower.includes("heif") ||
    nameLower.endsWith(".heic") ||
    nameLower.endsWith(".heif")
  ) {
    return { valid: false, error: "heic_detected" };
  }

  const hasAllowedMime = (ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(typeLower);
  const hasAllowedExt =
    nameLower.endsWith(".pdf") ||
    nameLower.endsWith(".jpg") ||
    nameLower.endsWith(".jpeg") ||
    nameLower.endsWith(".png");

  if (hasAllowedMime || hasAllowedExt) {
    return { valid: true };
  }

  return { valid: false, error: "unsupported_type" };
}
