<template>
  <div class="form-block">
    <span v-if="label" class="form-label">{{ label }}</span>

    <button
      v-if="widgetType === 'boolean'"
      type="button"
      class="switch"
      :class="{ on: Boolean(displayValue), readonly }"
      :disabled="readonly"
      @click="setDraft(!displayValue)"
    >
      <span class="knob" />
    </button>

    <select
      v-else-if="widgetType === 'ref:contact'"
      class="form-select"
      :value="displayValue"
      :disabled="readonly"
      @change="setDraft($event.target.value)"
    >
      <option value="" disabled>—</option>
      <option v-for="c in contactOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
    </select>

    <input
      v-else
      class="form-input"
      :type="widgetType === 'number' ? 'number' : 'text'"
      :value="displayValue"
      :readonly="readonly"
      @input="onRawInput($event.target.value)"
      @change="commitMode === 'blur' ? setDraft($event.target.value) : null"
    />

    <button
      v-if="commitMode === 'button' && !readonly"
      type="button"
      class="form-submit"
      @click="submitDraft"
    >
      {{ t('customApps.form.submit') }}
    </button>
  </div>
</template>

<script setup>
// The one block that lets the PLAYER write a value instead of just
// triggering an author-authored one — a name, a code, a note, a guess.
// Native `<input>`/`<select>`/switch-button — same convention every other
// player-facing text field on the phone uses (SetupWizard.vue's own
// `.name-input`, Settings' `.switch`), not Quasar form components, which
// this phone UI never uses for player input.
//
// Two targets (see blockKinds.js): a flag (`story.setFlag`, a real
// overwrite — applyEffects()'s own `effects.flags` accumulates a numeric
// delta instead, wrong semantics for "the player just typed 42") or one
// field of an entity instance (`effects.entities`'s existing 'set' op,
// unchanged). `entityId: '*'` resolves to the schema's first/only
// instance, same sentinel `{entity:...}` tokens use — no matching instance
// means there's nowhere to write, so the input still shows but changes are
// silently dropped, same "absent = no-op" spirit as every other block here.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const { contactOptions } = useContactOptions()
const { t } = useI18n()

// `commitMode` fixes the real UX bug the author found by clicking this
// block: the ORIGINAL version wrote on every keystroke, so an in-progress
// edit (or a moment where the player clears the field to retype) briefly
// wrote a half-typed/empty value into the flag or entity. 'live' keeps that
// old behavior (still right for e.g. a quick numeric jog); 'blur' commits
// only on blur/Enter (native <input> `change`), so partial typing never
// touches story state; 'button' defers to an explicit submit, for cases
// where the player should be able to back out entirely before committing.
const commitMode = computed(() => props.block.commitMode || 'live')
const readonly = computed(() => Boolean(props.block.readonly))

const label = computed(() => resolveDynamicText(props.block.label, story) || '')

// For `target: 'entity'`, the widget type comes from the field's OWN
// declared schema type instead of a second author choice — schedule/
// ref:entity fields are structured data, not a fit for one input, so
// they're excluded from the picker in BlockPropertiesForm.vue already; if
// an old block still names one (schema edited after the form was set up),
// this falls back to a plain text input rather than crashing.
const entityField = computed(() => {
  if (props.block.target !== 'entity') return null
  const schema = story.project?.gameConfig?.entitySchemas?.find(
    (s) => s.id === props.block.schemaId,
  )
  return schema?.fields?.find((f) => f.key === props.block.fieldKey) || null
})

const widgetType = computed(() => {
  if (props.block.target === 'entity') {
    const t = entityField.value?.type
    return t === 'boolean' || t === 'ref:contact' || t === 'number' ? t : 'text'
  }
  return props.block.inputType || 'text'
})

const resolvedEntityId = computed(() => {
  if (props.block.entityId && props.block.entityId !== '*') return props.block.entityId
  return story.entityItems(props.block.schemaId)[0]?.id || null
})

const currentValue = computed(() => {
  if (props.block.target === 'entity') {
    const id = resolvedEntityId.value
    return id ? (story.entities?.[props.block.schemaId]?.[id]?.[props.block.fieldKey] ?? '') : ''
  }
  return story.flags[props.block.flagKey] ?? ''
})

// Only meaningful in 'button' mode — otherwise `displayValue` always mirrors
// story state directly, so there's nothing to buffer.
const draft = ref(currentValue.value)
watch(currentValue, (v) => {
  draft.value = v
})

const displayValue = computed(() =>
  commitMode.value === 'button' ? draft.value : currentValue.value,
)

function setDraft(value) {
  if (commitMode.value === 'button') {
    draft.value = value
    return
  }
  onChange(value)
}

// 'live' commits every keystroke (see setDraft); 'blur'/'button' buffer the
// raw text locally and rely on the input's native `change` event or the
// submit button to actually call onChange.
function onRawInput(value) {
  if (commitMode.value === 'live') {
    setDraft(value)
    return
  }
  draft.value = value
}

function submitDraft() {
  onChange(draft.value)
}

function onChange(value) {
  if (props.block.target === 'entity') {
    const id = resolvedEntityId.value
    if (!id || !props.block.fieldKey) return
    story.applyEffects({
      entities: [
        {
          schemaId: props.block.schemaId,
          entityId: id,
          mode: 'set',
          fields: { [props.block.fieldKey]: value },
        },
      ],
    })
    return
  }
  const v = props.block.inputType === 'number' ? Number(value) || 0 : value
  story.setFlag(props.block.flagKey, v)
}
</script>

<style scoped>
.form-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: var(--app-text);
  opacity: 0.7;
}

.form-input,
.form-select {
  width: 100%;
  background: var(--app-surface);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--app-radius);
  padding: 11px 14px;
  color: var(--app-text);
  font-size: 15px;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--app-accent);
}

.form-input:read-only,
.form-select:disabled {
  opacity: 0.6;
  cursor: default;
}

.form-submit {
  align-self: flex-start;
  background: var(--app-accent);
  color: #fff;
  border: none;
  border-radius: var(--app-radius);
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
}

.switch {
  align-self: flex-start;
  width: 42px;
  height: 25px;
  border-radius: 13px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
}

.switch.on {
  background: var(--app-accent);
}

.switch.readonly {
  opacity: 0.6;
  cursor: default;
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch.on .knob {
  transform: translateX(17px);
}
</style>
