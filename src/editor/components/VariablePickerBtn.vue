<template>
  <q-btn dense flat round icon="data_object" size="sm" @click.stop tabindex="-1">
    <q-tooltip>{{ t('variablePicker.tooltip') }}</q-tooltip>
    <q-menu ref="menuRef" anchor="bottom right" self="top right">
      <div class="variable-picker">
        <div class="variable-picker__section-label">{{ t('variablePicker.widgetsTitle') }}</div>
        <button
          v-for="tok in FIXED_TOKENS"
          :key="tok.id"
          type="button"
          class="variable-picker__row"
          @click="pick(tok.token)"
        >
          <span class="variable-picker__token">{{ tok.token }}</span>
          <span class="variable-picker__desc">{{ t(`variablePicker.tokens.${tok.id}`) }}</span>
        </button>

        <template v-if="itemScope">
          <q-separator class="variable-picker__sep" />
          <div class="variable-picker__section-label">{{ itemSectionTitle }}</div>
          <button
            v-for="tok in itemTokens"
            :key="tok.id"
            type="button"
            class="variable-picker__row"
            @click="pick(tok.token)"
          >
            <span class="variable-picker__token">{{ tok.token }}</span>
            <span class="variable-picker__desc">{{
              tok.label ?? t(`variablePicker.tokens.${tok.id}`)
            }}</span>
          </button>
        </template>

        <template v-if="entitySchemas.length">
          <q-separator class="variable-picker__sep" />
          <div class="variable-picker__section-label">{{ t('variablePicker.entitiesTitle') }}</div>
          <p class="variable-picker__hint">{{ t('variablePicker.entitiesHint') }}</p>
          <template v-for="schema in entitySchemas" :key="schema.id">
            <div class="variable-picker__schema-label">{{ schema.label || schema.id }}</div>
            <button
              v-for="field in schema.fields || []"
              :key="field.key"
              type="button"
              class="variable-picker__row"
              @click="pick(entityToken(schema, field))"
            >
              <span class="variable-picker__token">{{ entityToken(schema, field) }}</span>
              <span class="variable-picker__desc">{{ field.label || field.key }}</span>
            </button>
          </template>
        </template>

        <q-separator class="variable-picker__sep" />
        <div class="variable-picker__section-label">{{ t('variablePicker.flagsTitle') }}</div>
        <template v-if="flagKeys.length">
          <button
            v-for="key in flagKeys"
            :key="key"
            type="button"
            class="variable-picker__row"
            @click="pick(flagToken(key))"
          >
            <span class="variable-picker__token">{{ flagToken(key) }}</span>
          </button>
        </template>
        <p v-else class="variable-picker__empty">{{ t('variablePicker.noFlags') }}</p>
      </div>
    </q-menu>
  </q-btn>
</template>

<script setup>
// Same "insert at caret" contract as EmojiPickerBtn.vue (emits `pick` with
// the raw string to splice in via insertEmojiAtCaret — that helper is
// already generic, not emoji-specific, despite the name) — reused as-is
// for tokens instead of building a parallel insertion mechanism.
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { collectFlags } from '@/project/collectFlags'
import {
  FIXED_TOKENS,
  CONTACT_ITEM_TOKENS,
  COLLECTION_ITEM_TOKENS,
  entityItemTokens,
} from '@/engine/customApps/resolveDynamicText'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()
const emit = defineEmits(['pick'])
const menuRef = ref(null)

// `false`, `'contacts'`, `'flagCollection'`, or `'entity:<schemaId>'` — set
// when this field is inside a `list` block's per-item template (forwarded
// from BlockBuilder.vue/BlockPropertiesForm.vue), and which item shape
// applies. The `{item:...}` tokens are meaningless anywhere else, so hidden
// by default (false). The entity case carries its schema id inline (rather
// than a separate prop) since it's the only one whose token SET isn't fixed
// — it has to look up that schema's own field list.
const props = defineProps({ itemScope: { type: [Boolean, String], default: false } })
const itemTokens = computed(() => {
  if (props.itemScope === 'flagCollection') return COLLECTION_ITEM_TOKENS
  if (typeof props.itemScope === 'string' && props.itemScope.startsWith('entity:')) {
    const schemaId = props.itemScope.slice('entity:'.length)
    const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
    return entityItemTokens(schema)
  }
  return CONTACT_ITEM_TOKENS
})

// This section's own header used to hardcode "Contact" regardless of the
// actual scope — a `list` block was contacts-only when it was written, but
// a `flagCollection`/`entityCollection` source (both reuse the exact same
// COLLECTION_ITEM_TOKENS, see resolveDynamicText.js) or an `entity` source
// is just as likely now (user-reported: mislabeled once collections/schema
// sources existed). Named per the actual scope instead.
const itemSectionTitle = computed(() => {
  if (props.itemScope === 'flagCollection') return t('variablePicker.itemTitleCollection')
  if (typeof props.itemScope === 'string' && props.itemScope.startsWith('entity:')) {
    const schemaId = props.itemScope.slice('entity:'.length)
    const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
    return t('variablePicker.itemTitleEntity', { schema: schema?.label || schema?.id || schemaId })
  }
  return t('variablePicker.itemTitleContacts')
})

// Same project-wide flag catalog already shown in the Flags dialog
// (FlagsPanel.vue) — flags are authored elsewhere (chapter/event
// effects), this just lists what already exists, doesn't create any.
const flagKeys = computed(() => collectFlags(story.project).map((f) => f.key))

// Unlike the `{item:...}` section above (only meaningful inside a `list`
// block's per-item template), `{entity:...}` tokens are usable in ANY text
// field — they name their schema+instance explicitly, so there's no
// "current item" to be inside of. Shown whenever the project has at least
// one schema with fields, regardless of itemScope. Only schemas with fields
// are listed — an empty one has nothing to insert.
const entitySchemas = computed(
  () => story.project?.gameConfig?.entitySchemas?.filter((s) => (s.fields || []).length) || [],
)

function flagToken(key) {
  return `{flag:${key}}`
}

// Plain function rather than inlining the template literal in the
// template — a literal `}}` produced by that string right next to the
// mustache's own closing `}}` breaks Vue's (naive, string-scanning)
// interpolation parser. Wrapping it in a call sidesteps that entirely.
function entityToken(schema, field) {
  return `{entity:${schema.id}:*:${field.key}}`
}

function pick(token) {
  emit('pick', token)
  menuRef.value?.hide()
}
</script>

<style scoped>
.variable-picker {
  width: 240px;
  max-height: 320px;
  overflow-y: auto;
  padding: var(--space-2);
}

.variable-picker__section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-1) 2px;
}

.variable-picker__sep {
  margin: var(--space-1) 0;
}

.variable-picker__schema-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  padding: 4px var(--space-1) 2px;
}

.variable-picker__hint {
  margin: 0;
  padding: 0 var(--space-1) 4px;
  font-size: 10.5px;
  color: var(--color-text-muted);
  font-style: italic;
}

.variable-picker__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.variable-picker__row:hover {
  background: var(--color-surface-hover);
}

.variable-picker__token {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-accent);
  flex-shrink: 0;
}

.variable-picker__desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-picker__empty {
  margin: 0;
  padding: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
