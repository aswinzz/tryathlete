/**
 * Convert a WebM video blob to MP4 using ffmpeg.wasm (single-threaded core,
 * no SharedArrayBuffer / COOP-COEP headers required).
 *
 * The FFmpeg instance is cached after first load so subsequent conversions
 * are fast (~30 MB WASM is only fetched once).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ffmpeg: any = null;

async function getFFmpeg() {
  if (_ffmpeg) return _ffmpeg;

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ff = new FFmpeg();

  // Single-threaded core — no SharedArrayBuffer required
  const BASE = "https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm";
  await ff.load({
    coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`,   "text/javascript"),
    wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });

  _ffmpeg = ff;
  return ff;
}

/**
 * Convert any video Blob to MP4 (H.264 + AAC, web-optimised).
 * Returns the original blob unchanged if it is already MP4.
 */
export async function toMp4(blob: Blob): Promise<Blob> {
  if (blob.type.includes("mp4")) return blob;

  const { fetchFile } = await import("@ffmpeg/util");
  const ff = await getFFmpeg();

  await ff.writeFile("input.webm", await fetchFile(blob));

  // Fast path: stream-copy if the source is already H.264
  let ok = await ff.exec([
    "-i", "input.webm",
    "-c:v", "copy",
    "-c:a", "aac",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  // Slow path: transcode VP9/VP8 → H.264 (ultrafast preset ≈ 5–15 s for 6 s clip)
  if (ok !== 0) {
    ok = await ff.exec([
      "-i", "input.webm",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "26",
      "-c:a", "aac",
      "-movflags", "+faststart",
      "output.mp4",
    ]);
  }

  if (ok !== 0) throw new Error("ffmpeg conversion failed");

  const data = await ff.readFile("output.mp4");

  // Clean up virtual FS
  ff.deleteFile("input.webm").catch(() => {});
  ff.deleteFile("output.mp4").catch(() => {});

  // Ensure we have a plain ArrayBuffer (data.buffer may be SharedArrayBuffer)
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  const plain = new Uint8Array(u8.byteLength);
  plain.set(u8);

  return new Blob([plain.buffer], { type: "video/mp4" });
}
