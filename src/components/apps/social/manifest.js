// See messages/manifest.js for the convention this follows.
export default {
  id: 'social',
  order: 2,
  labelKey: 'home.apps.social',
  icon: 'photo_camera',
  color: 'linear-gradient(135deg,#f093fb,#f5576c)',
  badge: (story) => story.totalDmUnread || 0,
}
