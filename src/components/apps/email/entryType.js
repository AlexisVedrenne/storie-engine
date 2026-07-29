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
  help: 'Un email reçu — apparaît dans l’app Email.',
  form: EmailEntryForm,

  defaultEntry({ firstContactId }) {
    return { type: 'email', from: firstContactId(), subject: '', text: '' }
  },

  // `story` is the full Pinia story store instance (same access a built-in
  // type's processEntry case has) — story.fill()/pushNotification()/
  // contactName() are all the existing engine API, nothing new added just
  // for this.
  process(entry, { story }) {
    story.customData.emails ??= {}
    const thread = (story.customData.emails[entry.from] ??= [])
    const subject = story.fill(entry.subject) || '(sans objet)'
    thread.push({
      id: entry.id || `email-${Date.now()}-${thread.length}`,
      subject,
      text: story.fill(entry.text) || '',
      ts: entry.ts || new Date().toISOString(),
    })

    story.customData.emailUnread ??= {}
    story.customData.emailUnread[entry.from] = (story.customData.emailUnread[entry.from] || 0) + 1

    story.pushNotification({
      app: 'email',
      contact: entry.from,
      title: story.contactName(entry.from),
      text: subject,
    })
  },

  extractText(entry) {
    return [entry.subject, entry.text]
  },

  collectReferences(entry) {
    return entry.from ? [{ kind: 'contact', id: entry.from }] : []
  },
}
