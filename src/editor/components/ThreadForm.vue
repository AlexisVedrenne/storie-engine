<template>
  <div class="thread-form">
    <div class="panel">
      <div class="section-label">
        Groupe de discussion (DM Insta)
        <FieldHelp
          text="Seuls les groupes ont besoin d'une entrée ici — les DM 1:1 utilisent directement l'id du contact comme thread, sans passer par threads.js."
        />
      </div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="thread.id" class="id-input" />
        <q-input dense outlined label="Nom du groupe" v-model="thread.name" class="grow" />
      </div>
      <q-select
        dense
        outlined
        multiple
        emit-value
        map-options
        label="Participants"
        :options="contactOptions"
        :model-value="thread.participants || []"
        @update:model-value="setParticipants"
      >
        <template #selected-item="scope">
          <q-chip
            dense
            :removable="scope.opt.value !== 'me'"
            @remove="removeParticipant(scope.opt.value)"
          >
            <span class="chip-dot" :style="{ background: contactColor(scope.opt.value) }" />
            {{ scope.opt.label }}
          </q-chip>
        </template>
      </q-select>
    </div>
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'

const props = defineProps({ thread: { type: Object, required: true } })
const { contactOptions, contactColor } = useContactOptions()

// 'me' must always be a participant (a visible group is always one the
// player is in, see docs/story-engine.md) — pre-included at creation and
// non-removable here rather than silently re-added, so it's never possible
// to end up with a saved group the player isn't part of.
function setParticipants(ids) {
  const set = new Set(ids)
  set.add('me')
  props.thread.participants = [...set]
}
function removeParticipant(id) {
  if (id === 'me') return
  props.thread.participants = (props.thread.participants || []).filter((p) => p !== id)
}
</script>

<style scoped>
.thread-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.grow {
  flex: 1;
}

.id-input {
  width: 160px;
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}
</style>
