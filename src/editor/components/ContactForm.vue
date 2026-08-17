<template>
  <div class="contact-form">
    <div class="panel">
      <div class="section-label">{{ t('contactForm.identityTitle') }}</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="contact.id" class="id-input" />
        <q-input
          dense
          outlined
          ref="nameInputRef"
          :label="t('contactForm.nameLabel')"
          v-model="contact.name"
          class="grow"
        >
          <template #append>
            <EmojiPickerBtn
              @pick="(e) => (contact.name = insertEmojiAtCaret(nameInputRef, contact.name, e))"
            />
          </template>
        </q-input>
      </div>
      <div class="field-label">{{ t('contactForm.colorLabel') }}</div>
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
        <span class="filename">{{ contact.color || t('contactForm.defaultColor') }}</span>
        <q-btn
          v-if="contact.color"
          dense
          flat
          round
          icon="close"
          size="sm"
          @click="contact.color = undefined"
        >
          <q-tooltip>{{ t('contactForm.resetColor') }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="panel">
      <div class="section-label">{{ t('contactForm.bioTitle') }}</div>
      <q-input
        dense
        outlined
        ref="bioInputRef"
        type="textarea"
        autogrow
        :label="t('contactForm.bioLabel')"
        v-model="contact.bio"
      >
        <template #append>
          <EmojiPickerBtn
            @pick="(e) => (contact.bio = insertEmojiAtCaret(bioInputRef, contact.bio, e))"
          />
        </template>
      </q-input>
    </div>

    <div class="panel">
      <div class="section-label">
        {{ t('contactForm.socialTitle') }}
        <FieldHelp :text="t('contactForm.socialHelp')" />
      </div>
      <q-toggle
        dense
        :label="t('contactForm.hasSocialLabel')"
        :model-value="contact.hasSocial !== false"
        @update:model-value="(v) => (contact.hasSocial = v ? undefined : false)"
      />
      <q-input dense outlined :label="t('contactForm.pseudoLabel')" v-model="contact.pseudo" />
      <div class="row">
        <q-input
          dense
          outlined
          type="number"
          :label="t('contactForm.followersLabel')"
          v-model.number="contact.followers"
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('contactForm.followingLabel')"
          v-model.number="contact.following"
          class="grow"
        />
      </div>
      <q-toggle
        dense
        :label="t('contactForm.followedByDefaultLabel')"
        :model-value="contact.followedByDefault !== false"
        @update:model-value="(v) => (contact.followedByDefault = v ? undefined : false)"
      />
    </div>

    <div class="panel">
      <div class="section-label">{{ t('contactForm.imagesTitle') }}</div>
      <AssetField
        v-model="contact.avatar"
        :label="t('contactForm.avatarLabel')"
        :contact-id="contact.id"
      />
      <AssetField
        v-model="contact.socialAvatar"
        :label="t('contactForm.socialAvatarLabel')"
        :contact-id="contact.id"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ contact: { type: Object, required: true } })
const nameInputRef = ref(null)
const bioInputRef = ref(null)
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
  flex-wrap: wrap;
  gap: var(--space-3);
}

.grow {
  flex: 1 1 160px;
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
