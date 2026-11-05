/**
 * Fork (imessage): the two things the chat says out loud.
 *
 * The bubble hides the work on purpose, so sound and touch are the only signals
 * that anything is happening. Two verbs, deliberately different:
 *
 * - `tick`  — still working (fires under the typing bubble, irregularly)
 * - `pop`   — a bubble just arrived
 *
 * Sound is best-effort. Placeholder WAVs ship in `assets/fork/` and are named by
 * verb, so swapping in a different set is a file replacement — no call site
 * knows anything about the samples.
 */
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const TICK_SAMPLE = require("../../../assets/fork/tick.wav") as number;
const POP_SAMPLE = require("../../../assets/fork/pop.wav") as number;

const players = new Map<number, AudioPlayer>();
let soundEnabled = true;

function playerFor(sample: number): AudioPlayer | null {
  const existing = players.get(sample);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(sample, { keepAudioSessionActive: false });
    player.volume = 1;
    players.set(sample, player);
    return player;
  } catch {
    // A missing platform audio backend must never break the chat.
    return null;
  }
}

function play(sample: number): void {
  if (!soundEnabled) return;
  const player = playerFor(sample);
  if (!player) return;
  try {
    // Rewind instead of allocating: a pop is 110ms, so the previous one is long gone.
    void player.seekTo(0).then(() => player.play());
  } catch {
    /* sound is decoration; a failure here is silent by definition */
  }
}

function haptic(style: Haptics.ImpactFeedbackStyle): void {
  // expo-haptics is a no-op on web, but it throws on some desktop runtimes.
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

/** A bubble arrived. */
export function popSenses(): void {
  play(POP_SAMPLE);
  haptic(Haptics.ImpactFeedbackStyle.Soft);
}

/** Still working. */
export function tickSenses(): void {
  play(TICK_SAMPLE);
  haptic(Haptics.ImpactFeedbackStyle.Light);
}

export function setForkSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}
