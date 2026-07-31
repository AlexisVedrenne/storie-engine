// Native app, same shape as every other built-in (email/settings/...) —
// see src/engine/apps/registry.js. Shows the player's path through the
// story so far (visitedChapterIds, see story.js#startChapter) and their
// current labeled flag values (game.flags[key].label, see FlagsPanel.vue).
export default {
  id: 'journal',
  order: 7,
  labelKey: 'home.apps.journal',
  icon: 'auto_stories',
  color: '#7c4dff',
  badge: () => 0, // no "unread" concept for this app — never shows a dot
}
