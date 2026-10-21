/** Local decoder: the only dynamic import is bundled by Next, never a remote service. */
let decoder: Promise<typeof import("jsqr")> | undefined;
export async function decodeQrPixels(data: Uint8ClampedArray, width: number, height: number) {
  decoder ??= import("jsqr");
  const { default: jsQR } = await decoder;
  const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return result ? result.data : null;
}

type NativeDetector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorConstructor = { new(options: { formats: string[] }): NativeDetector; getSupportedFormats(): Promise<string[]> };
let nativeDetector: Promise<NativeDetector | null> | undefined;
async function getNativeDetector() {
  nativeDetector ??= (async () => {
    const Constructor = (globalThis as typeof globalThis & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    try {
      return Constructor && (await Constructor.getSupportedFormats()).includes("qr_code") ? new Constructor({ formats: ["qr_code"] }) : null;
    } catch { return null; }
  })();
  return nativeDetector;
}

export async function decodeQrSource(source: CanvasImageSource, width: number, height: number, photo: boolean, current: () => boolean) {
  if (!width || !height || !current()) return null;
  const native = await getNativeDetector();
  if (native && current()) {
    try {
      const results = await native.detect(source);
      if (results.length) return results[0].rawValue;
    } catch { /* Safari and unsupported images use the bundled decoder. */ }
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas-unavailable");
  // Several resolutions help with small symbols on large screenshots and noisy photos.
  const sizes = photo ? [1600, 2400, 900] : [960];
  for (const maximum of sizes) {
    if (!current()) return null;
    const scale = Math.min(maximum / Math.max(width, height), photo ? 2 : 1);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.imageSmoothingEnabled = scale < 1;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const raw = await decodeQrPixels(pixels.data, pixels.width, pixels.height);
    if (raw !== null) return raw;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
  return null;
}
