import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Buffer de sortie ffmpeg (waveform) : assez large pour un enregistrement de
// terrain long (PCM 16 bits mono 8kHz ≈ 16 Ko/s, donc ~57 Mo/h) sans troncature.
const MAX_BUFFER_BYTES = 256 * 1024 * 1024;

export interface ProbeStream {
  codec_type: string;
  sample_rate?: string;
  duration?: string;
}

export interface ProbeResult {
  format: { duration?: string; format_name?: string };
  streams: ProbeStream[];
}

/** Validation du fichier déposé — voir plan/05-stockage-audio-internet-archive.md §5.3. */
export async function probeAudio(ffprobePath: string, filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  return JSON.parse(stdout) as ProbeResult;
}

/** Transcodage de la copie de lecture rapide en Opus 128kbps — voir plan/05 §5.9. */
export async function transcodeToOpus(ffmpegPath: string, inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-c:a",
    "libopus",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

/**
 * Peaks waveform pour l'affichage RecordingDetail : décode en PCM mono 8kHz
 * brut, puis calcule un pic (amplitude max normalisée 0-1) par bucket.
 */
export async function computeWaveformPeaks(
  ffmpegPath: string,
  inputPath: string,
  bucketCount: number
): Promise<number[]> {
  const { stdout } = await execFileAsync(
    ffmpegPath,
    ["-v", "error", "-i", inputPath, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"],
    { encoding: "buffer", maxBuffer: MAX_BUFFER_BYTES }
  );

  const buffer = stdout as unknown as Buffer;
  const sampleCount = Math.floor(buffer.byteLength / 2);
  if (sampleCount === 0) return [];

  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount);
  const bucketSize = Math.max(1, Math.floor(samples.length / bucketCount));
  const peaks: number[] = [];

  for (let start = 0; start < samples.length; start += bucketSize) {
    let max = 0;
    const end = Math.min(start + bucketSize, samples.length);
    for (let i = start; i < end; i++) {
      const abs = Math.abs(samples[i] ?? 0);
      if (abs > max) max = abs;
    }
    peaks.push(Number((max / 32768).toFixed(3)));
  }

  return peaks;
}
