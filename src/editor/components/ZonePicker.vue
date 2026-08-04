<template>
  <div class="zone-picker">
    <button
      type="button"
      class="anywhere-btn"
      :class="{ active: modelValue === 'anywhere' }"
      @click="emit('update:modelValue', 'anywhere')"
    >
      {{ t('zonePicker.anywhere') }}
    </button>
    <div class="grid">
      <button
        v-for="zone in GRID_ZONES"
        :key="zone"
        type="button"
        class="cell"
        :class="{ active: modelValue === zone }"
        :title="t(`zonePicker.zones.${zone}`)"
        @click="emit('update:modelValue', zone)"
      >
        <span class="dot" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ZONES } from '@/engine/interactions/zones'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

defineProps({ modelValue: { type: String, default: 'anywhere' } })
const emit = defineEmits(['update:modelValue'])

const GRID_ZONES = ZONES.filter((z) => z !== 'anywhere')
</script>

<style scoped>
.zone-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: fit-content;
}

.anywhere-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-xs);
  padding: 4px 10px;
  cursor: pointer;
}

.anywhere-btn.active {
  background: var(--color-accent-tint);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 28px);
  grid-template-rows: repeat(3, 28px);
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.cell .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
}

.cell.active {
  background: var(--color-accent-tint);
  border-color: var(--color-accent);
}

.cell.active .dot {
  background: var(--color-accent);
}
</style>
