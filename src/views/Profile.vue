<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModelCard from '../components/ModelCard.vue';

const user = ref({
  id: 1,
  nickname: 'artist123',
  name: 'John Doe',
  email: 'john@example.com',
  profileImageUrl: 'https://via.placeholder.com/120',
  createdAt: '2024-01-01',
});

const isEditing = ref(false);
const editForm = ref({
  nickname: '',
  profileImageUrl: '',
});

const activeTab = ref<'models' | 'favorites' | 'history'>('models');

const myModels = ref([
  {
    id: 1,
    title: 'My Anime Model',
    description: 'Personal anime character model',
    userNickname: 'artist123',
    likeCount: 45,
    viewCount: 250,
    favoriteCount: 20,
  },
]);

const favoriteModels = ref([]);
const generationHistory = ref([]);

onMounted(() => {
  // TODO: Fetch user data from API
  editForm.value = {
    nickname: user.value.nickname,
    profileImageUrl: user.value.profileImageUrl,
  };
});

const startEdit = () => {
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editForm.value = {
    nickname: user.value.nickname,
    profileImageUrl: user.value.profileImageUrl,
  };
};

const saveProfile = () => {
  // TODO: Call API to update profile
  user.value.nickname = editForm.value.nickname;
  user.value.profileImageUrl = editForm.value.profileImageUrl;
  isEditing.value = false;
};
</script>

<template>
  <div class="profile-page">
    <!-- Profile Header -->
    <div class="profile-header card mb-xl">
      <div class="flex items-start gap-lg flex-col-mobile">
        <!-- Avatar -->
        <div class="avatar-section">
          <img :src="user.profileImageUrl" alt="Profile" class="profile-avatar" />
        </div>

        <!-- User Info -->
        <div class="flex-1">
          <template v-if="!isEditing">
            <h1 class="text-3xl font-bold mb-sm">{{ user.nickname }}</h1>
            <p class="text-secondary mb-md">{{ user.email }}</p>
            <p class="text-sm text-muted">Member since {{ new Date(user.createdAt).toLocaleDateString() }}</p>
          </template>

          <template v-else>
            <div class="form-group">
              <label class="label">Nickname</label>
              <input v-model="editForm.nickname" type="text" class="input" />
            </div>
            <div class="form-group">
              <label class="label">Profile Image URL</label>
              <input v-model="editForm.profileImageUrl" type="text" class="input" />
            </div>
          </template>
        </div>

        <!-- Actions -->
        <div class="flex gap-sm">
          <template v-if="!isEditing">
            <button class="btn btn-primary" @click="startEdit">Edit Profile</button>
          </template>
          <template v-else>
            <button class="btn btn-secondary" @click="cancelEdit">Cancel</button>
            <button class="btn btn-primary" @click="saveProfile">Save</button>
          </template>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container mb-lg">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'models' }"
        @click="activeTab = 'models'"
      >
        My Models
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'favorites' }"
        @click="activeTab = 'favorites'"
      >
        Favorites
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        Generation History
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- My Models -->
      <div v-if="activeTab === 'models'">
        <div v-if="myModels.length" class="grid grid-cols-4 gap-lg">
          <a
            v-for="model in myModels"
            :key="model.id"
            :href="`/models/${model.id}`"
            style="text-decoration: none; color: inherit;"
          >
            <ModelCard
              :id="model.id"
              :title="model.title"
              :description="model.description"
              :userNickname="model.userNickname"
              :likeCount="model.likeCount"
              :viewCount="model.viewCount"
              :favoriteCount="model.favoriteCount"
            />
          </a>
        </div>
        <div v-else class="empty-state card text-center py-xl">
          <p class="text-secondary text-lg mb-md">You haven't created any models yet</p>
          <a href="/create" class="btn btn-primary">Create Your First Model</a>
        </div>
      </div>

      <!-- Favorites -->
      <div v-if="activeTab === 'favorites'">
        <div v-if="favoriteModels.length" class="grid grid-cols-4 gap-lg">
          <!-- Favorite models will be rendered here -->
        </div>
        <div v-else class="empty-state card text-center py-xl">
          <p class="text-secondary text-lg">No favorite models yet</p>
        </div>
      </div>

      <!-- Generation History -->
      <div v-if="activeTab === 'history'">
        <div v-if="generationHistory.length" class="grid grid-cols-4 gap-lg">
          <!-- Generation history will be rendered here -->
        </div>
        <div v-else class="empty-state card text-center py-xl">
          <p class="text-secondary text-lg">No generation history yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

.profile-header {
  padding: var(--space-xl);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 3px solid var(--border);
}

.tabs-container {
  display: flex;
  gap: var(--space-sm);
  border-bottom: 2px solid var(--border);
}

.tab-btn {
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

@media (max-width: 768px) {
  .flex-col-mobile {
    flex-direction: column;
  }

  .tabs-container {
    overflow-x: auto;
  }

  .tab-btn {
    white-space: nowrap;
  }
}
</style>
