// See messages/manifest.js for the convention this follows.
export default {
  id: 'calls',
  order: 4,
  labelKey: 'home.apps.calls',
  icon: 'call',
  color: '#8bc34a',
  badge: (story) => (story.pendingCall ? 1 : 0),
}
