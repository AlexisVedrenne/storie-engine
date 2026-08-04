// The scriptable "email" timeline entry type — an author can add this from
// TimelineEditor.vue's "Ajouter une entrée…" picker exactly like any
// built-in type, with zero further engine edits. See
// src/engine/apps/entryTypeRegistry.js for the full contract this
// implements.
import EmailEntryForm from './EmailEntryForm.vue'

export default {
  type: 'email',
  app: 'email',
  icon: 'mail',
  label: 'Email',
  help: 'Un email reçu — apparaît dans l’app Email. Contrairement aux SMS/DM, l’expéditeur est un email/nom écrits librement, pas un contact du projet.',
  form: EmailEntryForm,

  defaultEntry() {
    return { type: 'email', fromEmail: '', fromName: '', subject: '', text: '' }
  },

  // `story` is the full Pinia story store instance (same access a built-in
  // type's processEntry case has) — story.fill()/pushNotification() are the
  // existing engine API, nothing new added just for this. Storage is a
  // flat, newest-first array (unlike SMS/DM, an email isn't grouped by
  // sender/contact — see App.vue's own inbox list, a real Gmail-style flat
  // inbox rather than one thread per sender) — `read` lives on each email
  // itself instead of a separate per-contact unread map.
  process(entry, { story }) {
    story.customData.emails ??= []
    const subject = story.fill(entry.subject) || '(sans objet)'
    const fromName = story.fill(entry.fromName) || entry.fromEmail || ''
    story.customData.emails.unshift({
      id: entry.id || `email-${Date.now()}-${story.customData.emails.length}`,
      fromEmail: entry.fromEmail || '',
      fromName,
      subject,
      text: story.fill(entry.text) || '',
      ts: entry.ts || new Date().toISOString(),
      read: false,
    })

    story.pushNotification({ app: 'email', title: fromName, text: subject })
  },

  extractText(entry) {
    return [entry.fromName, entry.subject, entry.text]
  },

  // No project reference anymore — fromEmail/fromName are free text, same
  // spirit as a message's own `text`, not a link to project.contacts.
  collectReferences() {
    return []
  },
}
