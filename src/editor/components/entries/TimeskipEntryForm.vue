<template>
  <div class="entry-form">
    <p class="intro">Verrouille le téléphone et fait avancer l'heure/la date d'un coup.</p>
    <div class="row">
      <q-input dense outlined label="Heure (optionnel)" placeholder="08:00" v-model="entry.clock" />
      <q-input dense outlined label="Date (optionnel)" placeholder="19/07/2026" v-model="entry.date" />
    </div>
    <q-input
      dense
      outlined
      label="Label affiché sur le lock screen (optionnel)"
      placeholder="ex: Le lendemain"
      v-model="entry.label"
    />
    <div class="toggle-row">
      <q-toggle
        :model-value="entry.blocking !== false"
        label="Bloque la timeline jusqu'au déverrouillage"
        @update:model-value="(v) => (entry.blocking = v ? undefined : false)"
      />
      <FieldHelp
        text="Activé (par défaut) : l'histoire attend que le joueur déverrouille avant de continuer — coupure nette. Désactivé : la suite se joue en coulisses derrière l'écran verrouillé (messages/DM/appel s'accumulent normalement), comme un vrai téléphone dans une poche."
      />
    </div>
  </div>
</template>

<script setup>
import FieldHelp from '@/editor/components/FieldHelp.vue'

defineProps({ entry: { type: Object, required: true } })
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.toggle-row {
  display: flex;
  align-items: center;
}
</style>
