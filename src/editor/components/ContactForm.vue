<template>
  <div class="contact-form">
    <div class="panel">
      <div class="section-label">Identité</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="contact.id" class="id-input" />
        <q-input dense outlined label="Nom" v-model="contact.name" class="grow" />
      </div>
      <div class="field-label">Couleur (hex)</div>
      <!-- #999999 matches the fallback ContactList.vue's dot / ThreadForm.vue's
           participant chips already use for a contact with no color set —
           was wrongly `default-value="#4c8bf5"` before (that's the game's
           accent-color default, unrelated to contact identity colors). -->
      <div class="swatch-box" :style="{ background: contact.color || '#999999' }">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-color v-model="contact.color" default-value="#999999" no-header no-footer />
        </q-popup-proxy>
      </div>
      <div class="meta-row">
        <span class="filename">{{ contact.color || 'Par défaut (#999999)' }}</span>
        <q-btn v-if="contact.color" dense flat round icon="close" size="sm" @click="contact.color = undefined">
          <q-tooltip>Revenir à la couleur par défaut</q-tooltip>
        </q-btn>
      </div>
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
      <AssetField v-model="contact.avatar" label="Avatar (Téléphone / Messages / Appels)" :contact-id="contact.id" />
      <AssetField v-model="contact.socialAvatar" label="Avatar Pixly (Fil / Stories / DM / Profil)" :contact-id="contact.id" />
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

/* Same shape as AssetField.vue / GameForm.vue's Couleur d'interface (see
   docs/ui-design-principles.md) — big clickable preview, value as a small
   muted caption, action as an icon-only button. */
.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.swatch-box {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.filename {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
