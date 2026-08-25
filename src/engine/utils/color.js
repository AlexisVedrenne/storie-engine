// Derives a two-stop CSS gradient from a single accent hex — used to
// re-theme the phone's system-chrome screens (boot, setup wizard, lock
// screen, slot picker, age gate, réglages) when a project sets
// game.accentColor, WITHOUT needing the author to pick two colors
// themselves. The second stop is the same hue rotated forward and slightly
// darkened, echoing the engine's own default duotone (violet #7b5cff ->
// pink #f5576c) for whatever single color a project actually chose.
//
// Deliberately NOT applied to Pixly's own branding (App.vue/ProfileScreen/
// manifest.js's #f093fb->#f5576c) — that's the in-fiction social network's
// fixed visual identity, same as a real phone's Instagram icon not
// recoloring when the OS theme changes.

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  return { h: (h / 6) * 360, s: s * 100, l: l * 100 }
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  s /= 100
  l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Returns null for an empty/invalid input so callers can omit the CSS
// custom property entirely (same "unset, not even a fallback" convention
// PhoneShell.vue's --phone-accent already uses) rather than emit a broken
// gradient.
export function accentGradient(hex, angle = 135) {
  if (!hex) return null
  try {
    const { r, g, b } = hexToRgb(hex)
    const { h, s, l } = rgbToHsl(r, g, b)
    const stop2 = hslToHex(h + 45, s, Math.max(0, l - 10))
    return `linear-gradient(${angle}deg, ${hex}, ${stop2})`
  } catch {
    return null
  }
}
