// Metadata for the built-in Messages app — read by
// src/engine/apps/registry.js's auto-discovery scan (import.meta.glob over
// every apps/*/manifest.js), paired with this same folder's App.vue. See
// registry.js's own comment for the full convention a new app module (built-
// in or contributed) needs to follow to show up automatically.
export default {
  id: 'messages',
  order: 1,
  labelKey: 'home.apps.messages',
  icon: 'sms',
  color: '#4caf50',
  badge: (story) => story.totalUnread || 0,
}
