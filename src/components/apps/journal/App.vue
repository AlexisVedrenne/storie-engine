<template>
  <div class="app-screen">
    <AppTitleBar :title="t('journal.title')" icon="auto_stories" color="#7c4dff" @back="phone.goHome()" />

    <div class="tab-switch">
      <button class="tab-btn" :class="{ active: tab === 'progress' }" @click="tab = 'progress'">
        {{ t('journal.tabProgress') }}
      </button>
      <button class="tab-btn" :class="{ active: tab === 'flags' }" @click="tab = 'flags'">
        {{ t('journal.tabFlags') }}
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="tab === 'progress'" key="progress" class="tab-content">
        <div v-if="!progressNodes.length" class="empty">
          <q-icon name="auto_stories" size="46px" />
          <span>{{ t('journal.emptyProgress') }}</span>
        </div>
        <div v-else class="progress-list">
          <div v-for="(node, i) in progressNodes" :key="node.id" class="progress-node">
            <div class="node-rail">
              <span class="node-dot" :class="{ current: node.isCurrent }" />
              <span v-if="i < progressNodes.length - 1" class="node-line" />
            </div>
            <div class="node-body">
              <div class="node-title" :class="{ current: node.isCurrent }">{{ node.title }}</div>
              <div v-if="node.isCurrent" class="node-tag">{{ t('journal.youAreHere') }}</div>
              <div v-if="node.totalBranches > 1" class="branch-fork">
                <span class="fork-connector" />
                <span class="fork-node">?</span>
                <span class="fork-label">{{ forkLabel(node.unexploredCount) }}</span>
              </div>
              <div v-else-if="node.hasEnded" class="node-hint node-ended">{{ t('journal.pathEnded') }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else key="flags" class="tab-content">
        <div v-if="!labeledFlags.length" class="empty">
          <q-icon name="query_stats" size="46px" />
          <span>{{ t('journal.emptyFlags') }}</span>
        </div>
        <div v-else class="section">
          <div v-for="f in labeledFlags" :key="f.key" class="row">
            <q-icon :name="f.isBoolean ? 'check_circle' : 'flag'" size="18px" color="#7c4dff" />
            <span class="row-label">{{ f.label }}</span>
            <span v-if="f.isBoolean" class="row-sub flag-value">{{ t('journal.flagUnlocked') }}</span>
            <span v-else class="row-sub flag-value">{{ f.value }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

const tab = ref('progress') // 'progress' | 'flags'

const chaptersById = computed(() => {
  const map = {}
  for (const c of story.project?.chapters || []) map[c.id] = c
  return map
})

// bucket 'common', not chapter.id — a title names the chapter itself
// rather than being narrative content authored inside it, same reasoning
// as flag labels below (see extractTranslatableStrings.js's own comment).
function chapterTitle(chapter) {
  return story.translateStory(chapter.title || chapter.id, 'common')
}

// One node per visited chapter, oldest first — the edge actually taken
// from node i to node i+1 is whichever chapter.next entry targets
// visitedChapterIds[i+1] (advance() always starts the first satisfying
// edge right after a chapter's timeline ends, so this always matches).
// Every other outgoing edge is an unexplored branch, deliberately shown
// as just a count — never the target's own title, so this can't spoil
// content the player hasn't reached.
const progressNodes = computed(() => {
  const ids = story.visitedChapterIds
  const nodes = []
  for (let i = 0; i < ids.length; i++) {
    const chapter = chaptersById.value[ids[i]]
    if (!chapter) continue
    const isCurrent = i === ids.length - 1
    const takenNextId = ids[i + 1]
    const edges = chapter.next || []
    const unexploredCount = edges.filter((e) => e.to !== takenNextId).length
    nodes.push({
      id: chapter.id,
      title: chapterTitle(chapter),
      isCurrent,
      unexploredCount,
      // total paths out of this chapter (taken + not) — the fork is only
      // worth showing once there was an actual FORK, i.e. at least 2 paths
      // total; a chapter with only ever one way out shows nothing.
      totalBranches: edges.length,
      hasEnded: isCurrent && !edges.length,
    })
  }
  return nodes
})

function forkLabel(n) {
  return n === 1 ? t('journal.otherPathPossible') : t('journal.otherPathsPossible', { n })
}

// Labeled flags that have actually been touched this playthrough
// (`key in story.flags` — applyEffects only ever adds a key once some
// effect sets it, so an absent key means "never happened yet", not "0")
// — a flag authored but never reached yet has no business showing up as a
// stat. Boolean flags (game.flags[key].boolean, see FlagsPanel.vue) go
// one step further: only shown once true, since "you haven't done that
// yet" isn't a stat worth surfacing, unlike a numeric counter genuinely
// sitting at 0.
const labeledFlags = computed(() => {
  const defs = story.project?.gameConfig?.flags || {}
  return Object.entries(defs)
    .filter(([key, def]) => {
      if (!def?.label) return false
      if (!(key in story.flags)) return false
      if (def.boolean && !story.flags[key]) return false
      return true
    })
    .map(([key, def]) => ({
      key,
      label: story.translateStory(def.label, 'common'),
      isBoolean: Boolean(def.boolean),
      value: story.flags[key],
    }))
})
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-switch {
  display: flex;
  gap: 4px;
  margin: 2px 16px 12px;
  padding: 3px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tab-btn.active {
  background: rgba(124, 77, 255, 0.35);
  color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 16px 24px;
}

.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  text-align: center;
}

/* --- progress tab --- */
.progress-list {
  display: flex;
  flex-direction: column;
}

.progress-node {
  display: flex;
  gap: 12px;
}

.node-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
}

.node-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  margin-top: 4px;
  flex-shrink: 0;
}

.node-dot.current {
  background: #7c4dff;
  box-shadow: 0 0 0 4px rgba(124, 77, 255, 0.25);
}

.node-line {
  width: 2px;
  flex: 1;
  min-height: 28px;
  background: rgba(255, 255, 255, 0.12);
  margin-top: 2px;
}

.node-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 20px;
  color: #fff;
}

.node-title {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.85;
}

.node-title.current {
  opacity: 1;
  color: #b299ff;
}

.node-tag {
  display: inline-block;
  margin-top: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: #7c4dff;
}

.node-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.node-ended {
  font-style: italic;
}

/* a small ghost fork off the main rail — the branch that was NOT taken at
   this chapter, deliberately unlabeled (just "?") so it can't spoil what
   was down that path. */
.branch-fork {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 7px;
}

.fork-connector {
  width: 16px;
  height: 12px;
  border-left: 2px dashed rgba(255, 255, 255, 0.2);
  border-bottom: 2px dashed rgba(255, 255, 255, 0.2);
  border-bottom-left-radius: 8px;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: -12px;
}

.fork-node {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px dashed rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
}

.fork-label {
  font-size: 12px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.4);
}

/* --- flags tab --- */
.section {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 11px 14px;
  color: #fff;
}

.section .row:last-child {
  border-bottom: none;
}

.row-label {
  flex: 1;
  font-size: 14px;
}

.row-sub {
  font-size: 12.5px;
  opacity: 0.5;
}

.flag-value {
  font-size: 14px;
  font-weight: 700;
  opacity: 1;
  color: #b299ff;
}
</style>
