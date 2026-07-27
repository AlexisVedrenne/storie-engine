<template>
  <div class="contact-form">
    <div class="panel">
      <div class="section-label">Identité</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="contact.id" class="id-input" />
        <q-input dense outlined label="Nom" v-model="contact.name" class="grow" />
      </div>
      <q-input dense outlined label="Couleur (hex)" placeholder="#4c8bf5" v-model="contact.color">
        <template #prepend>
          <div class="swatch" :style="{ background: contact.color || 'transparent' }" />
        </template>
      </q-input>
    </div>

    <div class="panel">
      <div class="section-label">Bio</div>
      <q-input dense outlined type="textarea" autogrow label="Bio (profil Pixly)" v-model="contact.bio" />
    </div>

    <div class="panel">
      <div class="section-label">
        Réseau social (Pixly)
        <FieldHelp text="Contrôle la présence de ce contact sur Pixly (le réseau social du téléphone) — indépendant des SMS/Appels, qui utilisent toujours name." />
      </div>
      <q-toggle dense label="A un compte Pixly" :model-value="contact.hasSocial !== false" @update:model-value="(v) => (contact.hasSocial = v ? undefined : false)" />
      <q-input dense outlined label="Pseudo (sans @, optionnel)" v-model="contact.pseudo" />
      <div class="row">
        <q-input dense outlined type="number" label="Followers (optionnel)" v-model.number="contact.followers" class="grow" />
        <q-input dense outlined type="number" label="Following (optionnel)" v-model.number="contact.following" class="grow" />
      </div>
      <q-toggle
        dense
        label="Suivi par défaut en début de partie"
        :model-value="contact.followedByDefault !== false"
        @update:model-value="(v) => (contact.followedByDefault = v ? undefined : false)"
      />
    </div>

    <div class="panel">
      <div class="section-label">Images</div>
      <AssetField v-model="contact.avatar" label="Avatar (Téléphone / Messages / Appels)" />
      <AssetField v-model="contact.socialAvatar" label="Avatar Pixly (Fil / Stories / DM / Profil)" />
    </div>
  </div>
</template>

<script setup>
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'

defineProps({ contact: { type: Object, required: true } })
</script>

<style scoped>
.contact-form {
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

.swatch {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
</style>
