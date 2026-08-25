// Sound effect playback for the phone simulator — plain <audio> under the
// hood, gated by the phone's own mute switch/volume (see story.soundEnabled/
// soundVolume, Réglages > Sons et vibrations).
//
// Files live in public/sounds/ (not src/assets/) on purpose: public/ assets
// are served as-is, unprocessed by Vite, so a name in SOUND_FILES below
// resolves to a plain URL that doesn't need to exist at build time — drop
// the real .mp3 in later with zero code changes. A missing file just fails
// the play() promise quietly (see playSound/startLoop), same as a real
// notification sound nobody's recorded yet.
//
// Relative, not root-absolute ("./sounds/..." not "/sounds/..."): a packaged
// Electron app loads index.html via `file://`, where a leading "/" resolves
// to the filesystem root, not the app folder — same reasoning as
// engine-overrides/assets.js's resolveAssetUrl (its own comment already
// flagged this exact file as having the same bug, unfixed until now).
import { useStoryStore } from "@/engine/stores/story";
import { resolveAssetUrl } from "@/engine/assets";

// Exported so the editor (GameForm.vue's Sons section) can play the
// bundled default for a slot before/instead of overriding it — same paths
// getAudio() falls back to when a project sets no override.
export const SOUND_FILES = {
  "sms-receive": "./sounds/sms-receive.mp3",
  "sms-send": "./sounds/sms-send.mp3",
  "dm-receive": "./sounds/dm-receive.mp3",
  "social-send": "./sounds/social-send.mp3",
  "call-ringtone": "./sounds/call-ringtone.mp3",
  "call-accept": "./sounds/call-accept.mp3",
  "call-end": "./sounds/call-end.mp3",
  "social-like": "./sounds/social-like.mp3",
  "social-new-follower": "./sounds/social-new-follower.mp3",
  "social-story-tap": "./sounds/social-story-tap.mp3",
  "social-post-share": "./sounds/social-post-share.mp3",
  "system-boot": "./sounds/system-boot.mp3",
  "system-unlock": "./sounds/system-unlock.mp3",
  "system-notification": "./sounds/system-notification.mp3",
  "system-low-battery": "./sounds/system-low-battery.mp3",
};

// one <audio> element per sound, reused across plays instead of recreated
// each time — cheap, and required anyway for stopSound() to have something
// to pause (a loop like the ringtone needs a stable handle).
//
// Keyed on {audio, url} rather than just the Audio element: a project can
// override any of these 15 sounds (game.sounds, see GameForm.vue) with its
// own asset, and that override can change mid-session (edited in the Game
// tab, previewed again) — comparing the resolved url on every getAudio()
// call and rebuilding only when it actually changed means the override
// takes effect on the very next play, no separate cache-reset call needed
// anywhere else.
const pool = {};

// useStoryStore() is only ever called from inside a function body (see the
// comment on currentSettings() below) — same safe pattern applies here.
function resolveSoundUrl(name) {
  const store = useStoryStore();
  const override = store.project?.gameConfig?.sounds?.[name];
  return override ? resolveAssetUrl(override) : SOUND_FILES[name];
}

function getAudio(name) {
  if (!(name in SOUND_FILES)) {
    console.warn(`[sound] unknown sound "${name}"`);
    return null;
  }
  const url = resolveSoundUrl(name);
  if (!pool[name] || pool[name].url !== url) {
    const audio = new Audio(url);
    audio.preload = "auto";
    pool[name] = { audio, url };
  }
  return pool[name].audio;
}

// useStoryStore() is only ever called from inside the function bodies below
// (in response to a user/timeline event, well after both this module and
// story.js have finished loading) — safe despite story.js importing this
// file back, a standard-safe circular-import shape as long as neither side
// touches the other's export at module-evaluation time.
function currentSettings() {
  const store = useStoryStore();
  return {
    soundEnabled: store.soundEnabled,
    soundVolume: store.soundVolume,
    musicVolume: store.musicVolume,
  };
}

// one-shot sound effect — resets to the start so rapid repeats (a burst of
// messages landing back to back) each get the full sound instead of
// clipping the previous play.
export function playSound(name) {
  const { soundEnabled, soundVolume } = currentSettings();
  if (!soundEnabled) return;
  const audio = getAudio(name);
  if (!audio) return;
  audio.loop = false;
  audio.volume = Math.max(0, Math.min(100, soundVolume)) / 100;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// looping sound (ringtone) — stop with stopSound(name).
export function startLoop(name) {
  const { soundEnabled, soundVolume } = currentSettings();
  if (!soundEnabled) return;
  const audio = getAudio(name);
  if (!audio) return;
  audio.loop = true;
  audio.volume = Math.max(0, Math.min(100, soundVolume)) / 100;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function stopSound(name) {
  const audio = pool[name]?.audio;
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.loop = false;
}

// Background music — a `music` timeline entry names an arbitrary project
// asset, not one of the 15 fixed SOUND_FILES slots above, so it gets its
// own single <audio> handle instead of going through getAudio()'s named
// pool. Gated by soundEnabled like the sounds above, but scaled by BOTH
// soundVolume (master) and musicVolume (its own Réglages slider) — a
// player who wants SFX loud but music quiet/off needs that as a separate
// control, not tied to the master slider.
let musicAudio = null;
let musicFadeTimer = null;
// The track a fade-driven start/switch is fading OUT — kept separate from
// musicAudio (which already points at the new track) so its own fade can
// finish on its own timer without either one stepping on the other.
let outgoingAudio = null;
let outgoingFadeTimer = null;
// The author's per-track mix level for whatever musicAudio currently holds
// — playMusic() doesn't otherwise keep it after returning, but
// setMusicMuted() needs it to recompute the right volume when resuming
// from a mute, and a live slider drag mid-playback would too.
let musicEntryVolume = 100;

function pct(n) {
  return Math.max(0, Math.min(100, n)) / 100;
}

// `entryVolume` is the author's per-track mix level (0-100, `music` entry
// field) — multiplies on top of the player's own two sliders rather than
// replacing them, so an author can duck one busy track without touching
// the player's overall balance.
function targetMusicVolume({ soundVolume, musicVolume }, entryVolume) {
  return pct(soundVolume) * pct(musicVolume) * pct(entryVolume ?? 100);
}

// Ramps `audio.volume` from its current value to `target` over `ms` (16
// steps — smooth enough for a fade, cheap enough not to matter), calling
// `onDone` exactly once at the end. Returns the interval id so the caller
// can cancel it early (a second fade starting before the first finishes).
function rampVolume(audio, target, ms, onDone) {
  const steps = 16;
  const stepMs = Math.max(1, ms / steps);
  const from = audio.volume;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    audio.volume = from + (target - from) * (i / steps);
    if (i >= steps) {
      clearInterval(timer);
      audio.volume = target;
      onDone?.();
    }
  }, stepMs);
  return timer;
}

// `volume`: author's per-track level (0-100, see targetMusicVolume above).
// `fadeMs`: ramps the new track in over that duration; if a track is
// already playing, IT fades out over the same duration instead of cutting
// abruptly — two `music start` entries landing back to back (the author
// forgot a `stop`, or deliberately chained straight into the next song)
// crossfade rather than popping.
export function playMusic(assetPath, { loop = true, volume, fadeMs = 0 } = {}) {
  // A previous fade-out still in flight when ANOTHER track starts — let
  // that old element finish silencing on its own rather than yanking it,
  // two overlapping fades on the same <audio> would fight each other.
  if (outgoingFadeTimer) {
    clearInterval(outgoingFadeTimer);
    outgoingAudio?.pause();
    outgoingAudio = null;
    outgoingFadeTimer = null;
  }

  if (musicAudio) {
    if (musicFadeTimer) {
      clearInterval(musicFadeTimer);
      musicFadeTimer = null;
    }
    if (fadeMs > 0) {
      outgoingAudio = musicAudio;
      outgoingFadeTimer = rampVolume(outgoingAudio, 0, fadeMs, () => {
        outgoingAudio.pause();
        outgoingAudio = null;
        outgoingFadeTimer = null;
      });
    } else {
      musicAudio.pause();
    }
    musicAudio = null;
  }

  if (!assetPath) return;

  // Created (and its volume computed) even while muted — a `music` entry
  // firing mid-mute would otherwise leave nothing for setMusicMuted(false)
  // to resume later, silently dropping the track for good the moment the
  // player unmutes instead of picking it back up (see that function below).
  const settings = currentSettings();
  musicAudio = new Audio(resolveAssetUrl(assetPath));
  musicAudio.loop = loop;
  musicEntryVolume = volume ?? 100;
  const target = targetMusicVolume(settings, musicEntryVolume);
  musicAudio.volume = fadeMs > 0 ? 0 : target;
  if (!settings.soundEnabled) return;
  musicAudio.play().catch(() => {});
  if (fadeMs > 0) {
    musicFadeTimer = rampVolume(musicAudio, target, fadeMs, () => {
      musicFadeTimer = null;
    });
  }
}

// Réglages > Sons et vibrations toggle — PAUSES rather than stops: a hard
// stop (see stopMusic below) discards the element entirely, which left
// nothing to resume from, so turning sound back on never restarted the
// track (the actual bug this fixes). Keeps the same <audio> (and its
// currentTime) so unmuting picks up exactly where it left off, at the
// correct volume in case soundVolume/musicVolume changed while muted.
export function setMusicMuted(muted) {
  if (muted) {
    if (musicFadeTimer) {
      clearInterval(musicFadeTimer);
      musicFadeTimer = null;
    }
    if (outgoingFadeTimer) {
      clearInterval(outgoingFadeTimer);
      outgoingFadeTimer = null;
    }
    outgoingAudio?.pause();
    outgoingAudio = null;
    musicAudio?.pause();
  } else if (musicAudio) {
    musicAudio.volume = targetMusicVolume(currentSettings(), musicEntryVolume);
    musicAudio.play().catch(() => {});
  }
}

// Réglages > Sons et vibrations volume slider / the dedicated music slider
// — called live on every drag, not just at the next play(), so the change
// is actually audible right away instead of only taking effect the next
// time a `music` entry happens to fire. Skipped while a fade is actively
// ramping the volume itself (musicFadeTimer): the fade's own next tick
// would immediately overwrite this anyway, the two would just fight.
export function updateMusicVolume() {
  if (!musicAudio || musicFadeTimer) return;
  musicAudio.volume = targetMusicVolume(currentSettings(), musicEntryVolume);
}

// `onDone` fires once playback has actually stopped — immediately (no
// fade) or once the fade-out reaches silence — so a caller that mirrors
// "is anything playing" state (see story.js's stopMusic/nowPlaying) can
// clear it at the right moment instead of the instant this function returns.
export function stopMusic(fadeMs = 0, onDone) {
  if (musicFadeTimer) {
    clearInterval(musicFadeTimer);
    musicFadeTimer = null;
  }
  if (!musicAudio) {
    onDone?.();
    return;
  }
  const audio = musicAudio;
  musicAudio = null;
  if (fadeMs > 0) {
    rampVolume(audio, 0, fadeMs, () => {
      audio.pause();
      audio.currentTime = 0;
      onDone?.();
    });
  } else {
    audio.pause();
    audio.currentTime = 0;
    onDone?.();
  }
}
