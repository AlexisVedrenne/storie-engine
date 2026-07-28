<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="De (qui envoie le SMS)"
      :options="contactOptions"
      v-model="entry.contact"
    >
      <template #selected>
        <span class="selected-row">
          <span class="option-dot" :style="{ background: contactColor(entry.contact) }" />
          {{ story.getContact(entry.contact).name }}
        </span>
      </template>
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <span class="option-dot" :style="{ background: contactColor(scope.opt.value) }" />
          </q-item-section>
          <q-item-section>{{ scope.opt.label }}</q-item-section>
        </q-item>
      </template>
    </q-select>
    <q-input
      dense
      outlined
      type="textarea"
      autogrow
      label="Texte du message"
      placeholder="ex: Coucou ! Ça va ?"
      v-model="entry.text"
    />
    <AssetField v-model="entry.image" label="Photo jointe (optionnel)" :contact-id="entry.contact" />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()
const { contactOptionsNoMe: contactOptions } = useContactOptions()

// Same identity-dot pattern as ThreadForm.vue's participant chips (see
// docs/ui-design-principles.md) — a contact picker was plain text with no
// visual identity at all before this.
function contactColor(id) {
  return story.getContact(id)?.color || '#999999'
}
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.selected-row {
  display: inline-flex;
  align-items: center;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}
</style>
