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
import { useStoryStore } from "@/engine/stores/story";

const SOUND_FILES = {
  "sms-receive": "/sounds/sms-receive.mp3",
  "sms-send": "/sounds/sms-send.mp3",
  "dm-receive": "/sounds/dm-receive.mp3",
  "social-send": "/sounds/social-send.mp3",
  "call-ringtone": "/sounds/call-ringtone.mp3",
  "call-accept": "/sounds/call-accept.mp3",
  "call-end": "/sounds/call-end.mp3",
  "social-like": "/sounds/social-like.mp3",
  "social-new-follower": "/sounds/social-new-follower.mp3",
  "social-story-tap": "/sounds/social-story-tap.mp3",
  "social-post-share": "/sounds/social-post-share.mp3",
  "system-boot": "/sounds/system-boot.mp3",
  "system-unlock": "/sounds/system-unlock.mp3",
  "system-notification": "/sounds/system-notification.mp3",
  "system-low-battery": "/sounds/system-low-battery.mp3",
};

// one <audio> element per sound, reused across plays instead of recreated
// each time — cheap, and required anyway for stopSound() to have something
// to pause (a loop like the ringtone needs a stable handle).
const pool = {};

function getAudio(name) {
  if (!(name in SOUND_FILES)) {
    console.warn(`[sound] unknown sound "${name}"`);
    return null;
  }
  if (!pool[name]) {
    const audio = new Audio(SOUND_FILES[name]);
    audio.preload = "auto";
    pool[name] = audio;
  }
  return pool[name];
}

// useStoryStore() is only ever called from inside the function bodies below
// (in response to a user/timeline event, well after both this module and
// story.js have finished loading) — safe despite story.js importing this
// file back, a standard-safe circular-import shape as long as neither side
// touches the other's export at module-evaluation time.
function currentSettings() {
  const store = useStoryStore();
  return { soundEnabled: store.soundEnabled, soundVolume: store.soundVolume };
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
  const audio = pool[name];
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.loop = false;
}
