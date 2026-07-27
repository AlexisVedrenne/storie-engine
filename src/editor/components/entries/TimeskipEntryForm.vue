<template>
  <div class="entry-form">
    <div class="row">
      <q-input dense outlined label="Heure (HH:MM, optionnel)" v-model="entry.clock" />
      <q-input dense outlined label="Date (JJ/MM/AAAA, optionnel)" v-model="entry.date" />
    </div>
    <q-input dense outlined label="Label affiché (optionnel)" v-model="entry.label" />
    <q-toggle
      :model-value="entry.blocking !== false"
      label="Bloquant (attend le déverrouillage) — désactive pour laisser filer en coulisses"
      @update:model-value="(v) => (entry.blocking = v ? undefined : false)"
    />
  </div>
</template>

<script setup>
defineProps({ entry: { type: Object, required: true } })
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  gap: 8px;
}
</style>
