<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api';

const route = useRoute();
const router = useRouter();
const modelId = ref(Number(route.params.id));
const loading = ref(true);
const error = ref('');

const model = ref({
  id: 1,
  title: 'Anime Character Model',
  description: 'High quality anime character generation model with detailed features',
  userNickname: 'artist123',
  userId: 1,
  likeCount: 245,
  viewCount: 1250,
  isLiked: false,
  samples: [
    { id: 1, imageUrl: 'https://via.placeholder.com/400x500' },
    { id: 2, imageUrl: 'https://via.placeholder.com/400x500' },
    { id: 3, imageUrl: 'https://via.placeholder.com/400x500' },
  ],
  prompts: [
    {
      id: 1,
      title: 'Basic Prompt',
      prompt: '1girl, long hair, anime style, detailed face',
      negativePrompt: 'nsfw, lowres, bad anatomy',
      description: 'Basic character generation prompt',
    },
  ],
  tags: [
    { id: 1, name: 'Anime' },
    { id: 2, name: 'Character' },
    { id: 3, name: 'Portrait' },
  ],
});

const comments = ref([
  {
    id: 1,
    userId: 2,
    userNickname: 'user123',
    userProfileImageUrl: 'https://via.placeholder.com/40',
    content: 'Amazing model! Great results!',
    likeCount: 12,
    createdAt: '2024-01-15T10:00:00',
  },
]);

const newComment = ref('');

onMounted(async () => {
  await fetchModelDetails();
  await fetchComments();
});

const fetchModelDetails = async () => {
  try {
    loading.value = true;
    const response = await api.models.getModelDetail(modelId.value);

    model.value = {
      ...response.data,
      isLiked: response.data.isLiked || false,
      samples: response.data.samples || [],
      prompts: response.data.prompts || [],
      tags: response.data.tags || [],
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load model';
    console.error('Failed to fetch model:', err);
  } finally {
    loading.value = false;
  }
};

const fetchComments = async () => {
  try {
    const response = await api.community.getComments(modelId.value, 0, 20);
    comments.value = response.data.content;
  } catch (err) {
    console.error('Failed to fetch comments:', err);
  }
};

const toggleLike = async () => {
  try {
    await api.community.toggleLike(modelId.value);
    model.value.isLiked = !model.value.isLiked;
    model.value.likeCount += model.value.isLiked ? 1 : -1;
  } catch (err) {
    console.error('Failed to toggle like:', err);
  }
};


const submitComment = async () => {
  if (!newComment.value.trim()) return;

  try {
    const response = await api.community.createComment(modelId.value, newComment.value);
    comments.value.unshift(response.data);
    newComment.value = '';
  } catch (err) {
    console.error('Failed to create comment:', err);
  }
};

const toggleCommentLike = async (commentId: number) => {
  try {
    const response = await api.community.toggleCommentLike(modelId.value, commentId);
    // Update the comment in local state
    const comment = comments.value.find(c => c.id === commentId);
    if (comment) {
      comment.isLiked = response.data.isLiked;
      comment.likeCount += response.data.isLiked ? 1 : -1;
    }
  } catch (err) {
    console.error('Failed to toggle comment like:', err);
  }
};

const copyPrompt = (prompt: string) => {
  navigator.clipboard.writeText(prompt);
  // TODO: Show toast notification
};

const goToGenerate = () => {
  router.push(`/generate?modelId=${modelId.value}`);
};
</script>

<template>
  <div class="model-detail-page">
    <!-- Header -->
    <div class="model-header mb-xl">
      <div class="flex items-start justify-between gap-lg flex-col-mobile">
        <div class="flex-1">
          <h1 class="text-4xl font-bold mb-md">{{ model.title }}</h1>
          <p class="text-lg text-secondary mb-md">{{ model.description }}</p>

          <!-- Author -->
          <div class="flex items-center gap-md mb-lg">
            <img src="https://via.placeholder.com/48" alt="Author" class="avatar avatar-lg" />
            <div>
              <p class="font-semibold">{{ model.userNickname }}</p>
              <p class="text-sm text-secondary">View Profile</p>
            </div>
          </div>

          <!-- Tags -->
          <div class="flex flex-wrap gap-sm">
            <span v-for="tag in model.tags" :key="tag.id" class="tag">
              {{ tag.name }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-sm">
          <button class="btn btn-secondary btn-icon" @click="toggleLike" :class="{ 'btn-primary': model.isLiked }">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="model.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {{ model.likeCount }}
          </button>
          <button class="btn btn-primary" @click="goToGenerate">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            이 모델로 생성하기
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar card-sm flex items-center gap-xl mt-lg">
        <div class="stat-item">
          <span class="text-2xl font-bold">{{ model.viewCount }}</span>
          <span class="text-sm text-secondary">Views</span>
        </div>
        <div class="stat-item">
          <span class="text-2xl font-bold">{{ model.likeCount }}</span>
          <span class="text-sm text-secondary">Likes</span>
        </div>
      </div>
    </div>

    <!-- Sample Images -->
    <section class="samples-section mb-xl">
      <h2 class="text-2xl font-bold mb-lg">Sample Images</h2>
      <div class="grid grid-cols-4 gap-lg">
        <div v-for="sample in model.samples" :key="sample.id" class="sample-item">
          <img :src="sample.imageUrl" alt="Sample" class="img-cover rounded-lg" />
        </div>
      </div>
    </section>

    <!-- Prompts -->
    <section class="prompts-section mb-xl">
      <h2 class="text-2xl font-bold mb-lg">Prompt Examples</h2>
      <div class="grid grid-cols-1 gap-lg">
        <div v-for="prompt in model.prompts" :key="prompt.id" class="card">
          <h3 class="font-semibold mb-md">{{ prompt.title }}</h3>
          <div class="prompt-box mb-md">
            <div class="flex items-center justify-between mb-sm">
              <span class="text-sm text-secondary">Positive Prompt</span>
              <button class="btn btn-ghost btn-sm" @click="copyPrompt(prompt.prompt)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
            <p class="prompt-text">{{ prompt.prompt }}</p>
          </div>
          <div class="prompt-box">
            <div class="flex items-center justify-between mb-sm">
              <span class="text-sm text-secondary">Negative Prompt</span>
              <button class="btn btn-ghost btn-sm" @click="copyPrompt(prompt.negativePrompt)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
            <p class="prompt-text">{{ prompt.negativePrompt }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Comments -->
    <section class="comments-section">
      <h2 class="text-2xl font-bold mb-lg">Comments</h2>

      <!-- Comment Form -->
      <div class="card mb-lg">
        <textarea
          v-model="newComment"
          class="textarea mb-md"
          placeholder="Write a comment..."
          rows="3"
        ></textarea>
        <button class="btn btn-primary" @click="submitComment">Post Comment</button>
      </div>

      <!-- Comment List -->
      <div class="comments-list flex flex-col gap-md">
        <div v-for="comment in comments" :key="comment.id" class="card-sm">
          <div class="flex items-start gap-md">
            <img :src="comment.userProfileImageUrl" alt="User" class="avatar" />
            <div class="flex-1">
              <div class="flex items-center gap-sm mb-xs">
                <span class="font-semibold">{{ comment.userNickname }}</span>
                <span class="text-xs text-muted">{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
              </div>
              <p class="text-secondary mb-sm">{{ comment.content }}</p>
              <button
                class="btn btn-ghost btn-sm"
                :class="{ 'text-error': comment.isLiked }"
                @click="toggleCommentLike(comment.id)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="comment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                {{ comment.likeCount }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.model-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

.stats-bar {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.sample-item {
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: transform 0.3s ease;
}

.sample-item:hover {
  transform: scale(1.05);
}

.prompt-box {
  background: var(--bg-hover);
  padding: var(--space-md);
  border-radius: var(--radius-md);
}

.prompt-text {
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .flex-col-mobile {
    flex-direction: column;
  }
}
</style>
