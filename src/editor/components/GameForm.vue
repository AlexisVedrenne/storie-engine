<template>
  <div class="panel">
    <div class="section-label">Jeu</div>
    <q-input dense outlined label="Titre (affiché sur l'écran verrouillé)" v-model="game.title" />
  </div>
</template>

<script setup>
defineProps({ game: { type: Object, required: true } })
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  max-width: 420px;
}

.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
</style>
