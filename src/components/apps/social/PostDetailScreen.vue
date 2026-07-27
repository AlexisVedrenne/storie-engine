<template>
  <div class="post-detail-screen">
    <AppHeader :title="t('social.postTitle')" @back="$emit('back')" />
    <div class="post-detail-body">
      <PostCard
        v-if="post"
        :post="post"
        @open-profile="$emit('open-profile', $event)"
        @open-comments="$emit('open-comments', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppHeader from '@/components/phone/AppHeader.vue'
import PostCard from './PostCard.vue'

const props = defineProps({ postId: { type: String, default: null } })
defineEmits(['back', 'open-profile', 'open-comments'])

const story = useStoryStore()
const { t } = useI18n()
// reactive lookup rather than a prop-passed object — the post can change
// under us (a like toggling) without this screen needing its own copy.
const post = computed(() => story.feedPosts.find(p => p.id === props.postId) || null)
</script>

<style scoped>
.post-detail-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.post-detail-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
