import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeWaveformPeaks, probeAudio, transcodeToOpus } from "../lib/audio.js";

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

/**
 * Ces tests exercent le vrai binaire ffmpeg/ffprobe (système, voir apps/worker/src/config.ts)
 * plutôt que de le mocker : c'est justement l'intégration avec ces outils
 * externes que le pipeline "publish-recording" (plan/05 §5.3) doit valider.
 * CI : voir .github/workflows/ci.yml (installation apt ffmpeg).
 */
describe("pipeline audio (ffprobe/ffmpeg)", () => {
  let workDir: string;
  let fixtureWav: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "arborisis-audio-test-"));
    fixtureWav = path.join(workDir, "fixture.wav");
    // 2 secondes de sinusoïde 440Hz, mono 44.1kHz — fixture générée sans
    // dépendre d'un fichier binaire versionné dans le repo.
    await execFileAsync(FFMPEG, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=2",
      "-ac",
      "1",
      "-ar",
      "44100",
      fixtureWav,
    ]);
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("probe détecte un flux audio et la bonne durée", async () => {
    const probe = await probeAudio(FFPROBE, fixtureWav);
    const audioStream = probe.streams.find((s) => s.codec_type === "audio");
    expect(audioStream).toBeDefined();
    expect(Math.round(Number(probe.format.duration))).toBe(2);
  });

  it("transcode en Opus et produit un fichier non vide", async () => {
    const outputPath = path.join(workDir, "proxy.opus");
    await transcodeToOpus(FFMPEG, fixtureWav, outputPath);
    const { size } = await stat(outputPath);
    expect(size).toBeGreaterThan(0);
  });

  it("calcule des peaks waveform non nuls pour une sinusoïde", async () => {
    const peaks = await computeWaveformPeaks(FFMPEG, fixtureWav, 50);
    expect(peaks.length).toBeGreaterThan(0);
    expect(peaks.length).toBeLessThanOrEqual(51); // dernier bucket potentiellement partiel
    // Pas d'hypothèse sur l'amplitude exacte : la source `sine` de ffmpeg ne
    // génère pas du plein échelle par défaut (constaté : ±4095 sur du s16,
    // pas ±32767) — on vérifie juste qu'un signal réel a bien été mesuré et
    // que les peaks sont cohérents entre eux, pas une valeur absolue liée à
    // un détail d'implémentation du générateur de fixture.
    const maxPeak = Math.max(...peaks);
    expect(maxPeak).toBeGreaterThan(0);
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
      // Une sinusoïde à amplitude constante ne doit pas produire de bucket
      // proche de zéro au milieu du signal (détecterait un vrai bug de
      // décodage/troncature plutôt qu'un simple détail d'amplitude).
      expect(peak).toBeGreaterThan(maxPeak * 0.5);
    }
  });
});
