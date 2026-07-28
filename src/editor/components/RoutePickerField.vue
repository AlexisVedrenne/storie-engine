<template>
  <div class="route-picker-field">
    <q-select
      dense
      outlined
      emit-value
      map-options
      class="grow"
      :label="label"
      :options="selectOptions"
      :model-value="modelValue"
      @update:model-value="onSelect"
    >
      <template #selected>
        <span v-if="modelValue" class="selected-row">
          <span class="option-dot" :style="{ background: routeColor(modelValue) }" />
          {{ routeLabel(modelValue) }}
        </span>
        <span v-else>Aucune</span>
      </template>
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section v-if="scope.opt.value === NEW" avatar>
            <q-icon name="add" />
          </q-item-section>
          <q-item-section v-else-if="scope.opt.value" avatar>
            <span class="option-dot" :style="{ background: routeColor(scope.opt.value) }" />
          </q-item-section>
          <q-item-section>{{ scope.opt.label }}</q-item-section>
        </q-item>
      </template>
    </q-select>
    <q-btn v-if="modelValue" dense flat round icon="edit" size="sm" @click="openEdit">
      <q-tooltip>Modifier cette route</q-tooltip>
    </q-btn>

    <q-dialog v-model="dialogOpen">
      <q-card class="route-dialog-card">
        <q-card-section>
          <div class="text-subtitle1">{{ editingId ? 'Modifier la route' : 'Nouvelle route' }}</div>
          <q-input
            v-if="!editingId"
            dense
            outlined
            label="Identifiant (id)"
            v-model="draft.id"
            class="q-mt-sm"
          />
          <q-input dense outlined label="Nom" v-model="draft.name" class="q-mt-sm" />

          <div class="field-label q-mt-sm">Couleur (hex)</div>
          <div class="swatch-box" :style="{ background: draft.color || '#999999' }">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-color v-model="draft.color" default-value="#999999" no-header no-footer />
            </q-popup-proxy>
          </div>

          <q-select
            dense
            outlined
            emit-value
            map-options
            label="Route parente (optionnel)"
            class="q-mt-sm"
            :options="parentOptions"
            v-model="draft.parentId"
          >
            <template #selected>
              <span v-if="draft.parentId" class="selected-row">
                <span class="option-dot" :style="{ background: routeColor(draft.parentId) }" />
                {{ routeLabel(draft.parentId) }}
              </span>
              <span v-else>Aucune (route racine)</span>
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section v-if="scope.opt.value" avatar>
                  <span class="option-dot" :style="{ background: routeColor(scope.opt.value) }" />
                </q-item-section>
                <q-item-section>{{ scope.opt.label }}</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-if="editingId"
            flat
            label="Supprimer"
            color="negative"
            class="delete-btn"
            @click="deleteRoute"
          />
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            flat
            label="Enregistrer"
            color="primary"
            :disable="!draft.id || !draft.name"
            @click="confirmDialog"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useRouteOptions } from '@/editor/composables/useRouteOptions'
import { descendantsOf } from '@/project/routeTree'
import { findReferences } from '@/project/findReferences'
import { serializeRoutes } from '@/project/serializeChapter'

// Sentinel option value for "+ Nouvelle route…" inside the select's own
// dropdown — intercepted in onSelect() before it ever reaches
// `modelValue`, so the parent never sees this fake id.
const NEW = '__new_route__'

const props = defineProps({
  modelValue: { default: undefined },
  label: { type: String, default: 'Route (optionnel)' },
})
const emit = defineEmits(['update:modelValue'])

const story = useStoryStore()
const { routeOptions, routeColor, routeLabel } = useRouteOptions()

// Routes have no dedicated tab anymore (folded into whichever chapter/
// choice picks them, see EditorPage.vue) — create/edit/delete all live
// here instead, self-persisting immediately like ContactList.vue's
// create/delete used to (not routed through the generic dirty/autosave
// system, which is scoped to whichever tab is currently open).
const routes = story.project.routes

const selectOptions = computed(() => [
  { label: 'Aucune', value: undefined },
  ...routeOptions.value,
  { label: '+ Nouvelle route…', value: NEW },
])

function onSelect(value) {
  if (value === NEW) {
    openCreate()
    return
  }
  emit('update:modelValue', value)
}

const dialogOpen = ref(false)
const editingId = ref(null)
const draft = reactive({ id: '', name: '', color: '#4c8bf5', parentId: undefined })

const parentOptions = computed(() => {
  const excluded = new Set(
    editingId.value
      ? [editingId.value, ...descendantsOf(routes, editingId.value).map((r) => r.id)]
      : [],
  )
  return [
    { label: 'Aucune (route racine)', value: undefined },
    ...routes.filter((r) => !excluded.has(r.id)).map((r) => ({ label: r.name, value: r.id })),
  ]
})

function openCreate() {
  editingId.value = null
  Object.assign(draft, { id: '', name: '', color: '#4c8bf5', parentId: undefined })
  dialogOpen.value = true
}

function openEdit() {
  const route = story.getRoute(props.modelValue)
  if (!route) return
  editingId.value = route.id
  Object.assign(draft, {
    id: route.id,
    name: route.name,
    color: route.color,
    parentId: route.parentId,
  })
  dialogOpen.value = true
}

async function persist() {
  await window.storieAPI.saveRoutes({
    rootPath: story.project.rootPath,
    source: serializeRoutes(routes),
  })
}

async function confirmDialog() {
  const id = draft.id.trim()
  if (!id || !draft.name.trim()) return

  if (editingId.value) {
    const route = routes.find((r) => r.id === editingId.value)
    if (route) {
      route.name = draft.name.trim()
      route.color = draft.color || undefined
      route.parentId = draft.parentId
    }
  } else {
    if (routes.some((r) => r.id === id)) return
    routes.push({
      id,
      name: draft.name.trim(),
      color: draft.color || undefined,
      parentId: draft.parentId,
    })
  }
  await persist()
  emit('update:modelValue', id)
  Notify.create({
    type: 'positive',
    message: editingId.value ? 'Route mise à jour.' : 'Route créée.',
  })
}

function deleteRoute() {
  const route = routes.find((r) => r.id === editingId.value)
  if (!route) return
  const refs = findReferences(story.project, { type: 'route', id: route.id })
  if (refs.length) {
    Dialog.create({
      title: 'Suppression impossible',
      message: `« ${route.name || route.id} » est encore utilisée :\n\n${refs.join('\n')}`,
      ok: true,
      color: 'primary',
    })
    return
  }
  Dialog.create({
    title: 'Supprimer cette route ?',
    message: `« ${route.name || route.id} » sera supprimée du disque. Cette action est irréversible.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    const idx = routes.findIndex((r) => r.id === route.id)
    routes.splice(idx, 1)
    await persist()
    if (props.modelValue === route.id) emit('update:modelValue', undefined)
    dialogOpen.value = false
    Notify.create({ type: 'positive', message: 'Route supprimée.' })
  })
}
</script>

<style scoped>
.route-picker-field {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.grow {
  flex: 1;
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

.route-dialog-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.swatch-box {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.delete-btn {
  margin-right: auto;
}
</style>
