// Proof-of-concept plug-in app — built using ONLY the documented
// registry.js/entryTypeRegistry.js conventions, zero edits to any of the 5
// mechanism files (story.js, TimelineEditor.vue, extractTranslatableStrings.js,
// validateProject.js, appIds.js) beyond the one-time additive fallback each
// already got. See entryType.js in this same folder for the scriptable
// "email" timeline entry type.
export default {
  id: 'email',
  order: 6,
  labelKey: 'home.apps.email',
  icon: 'mail',
  color: '#3f8cff',
  badge: (story) => (story.customData?.emails || []).filter((e) => !e.read).length,
}
