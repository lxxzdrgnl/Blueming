<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '../services/api';

const title = ref('');
const description = ref('');
const characterName = ref('');
const style = ref('');
const trainingImagesCount = ref(20);
const learningRate = ref(0.0001);
const epochs = ref(10);
const loraRank = ref(8);
const baseModel = ref('stablediffusionapi/anything-v5');
const isPublic = ref(false);

const isTraining = ref(false);
const modelId = ref<number | null>(null);
const trainingJobId = ref<number | null>(null);
const error = ref('');
const currentEpoch = ref(0);
const totalEpochs = ref(0);
const statusMessage = ref('');

const trainingHistory = ref<any[]>([]);

let eventSource: EventSource | null = null;

onMounted(async () => {
  await loadTrainingHistory();
});

const loadTrainingHistory = async () => {
  try {
    const response = await api.training.getMyTrainingJobs();
    trainingHistory.value = response.data;
  } catch (err) {
    console.error('Failed to load training history:', err);
  }
};

const startTraining = async () => {
  if (!title.value.trim()) {
    error.value = 'Please enter a model title';
    return;
  }

  try {
    isTraining.value = true;
    error.value = '';
    currentEpoch.value = 0;
    totalEpochs.value = epochs.value;
    statusMessage.value = 'Creating model...';

    // 1. Create model with training parameters
    const modelResponse = await api.training.createModel({
      title: title.value,
      description: description.value,
      characterName: characterName.value,
      style: style.value,
      trainingImagesCount: trainingImagesCount.value,
      epochs: epochs.value,
      learningRate: learningRate.value,
      loraRank: loraRank.value,
      baseModel: baseModel.value,
      isPublic: isPublic.value,
    });

    modelId.value = modelResponse.data.id;
    statusMessage.value = 'Creating training job...';

    // 2. Create training job
    const jobResponse = await api.training.createTrainingJob(modelId.value);
    trainingJobId.value = jobResponse.data.id;
    statusMessage.value = 'Starting training...';

    // 3. Start training
    await api.training.startTraining(trainingJobId.value, {
      epochs: epochs.value,
      learningRate: learningRate.value,
      loraRank: loraRank.value,
    });

    statusMessage.value = 'Training started...';

    // 4. Connect to SSE for progress
    connectToProgressStream();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start training';
    isTraining.value = false;
  }
};

const connectToProgressStream = () => {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = api.training.streamTrainingProgress((data) => {
    if (data.status === 'TRAINING' || data.status === 'IN_PROGRESS') {
      currentEpoch.value = (data.currentEpoch as number) || 0;
      totalEpochs.value = (data.totalEpochs as number) || epochs.value;
      statusMessage.value = (data.phase as string) || 'Training...';
    } else if (data.status === 'COMPLETED') {
      isTraining.value = false;
      statusMessage.value = 'Training completed successfully!';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      // Reload training history
      loadTrainingHistory();
    } else if (data.status === 'FAILED') {
      isTraining.value = false;
      error.value = (data.errorMessage as string) || 'Training failed';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    }
  });
};

const cancelTraining = async () => {
  if (!trainingJobId.value) return;

  try {
    await api.training.deleteTrainingJob(trainingJobId.value);
    isTraining.value = false;
    statusMessage.value = 'Training cancelled';
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  } catch (err) {
    console.error('Failed to cancel training:', err);
  }
};

const deleteTrainingJob = async (id: number) => {
  try {
    await api.training.deleteTrainingJob(id);
    trainingHistory.value = trainingHistory.value.filter(t => t.id !== id);
  } catch (err) {
    console.error('Failed to delete training:', err);
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'color: #ffffff;';
    case 'IN_PROGRESS':
      return 'color: #b0b0b0;';
    case 'FAILED':
      return 'color: #707070;';
    default:
      return 'color: #b0b0b0;';
  }
};

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
  }
});
</script>

<template>
  <div class="training-page">
    <div class="container-sm">
      <!-- Header -->
      <div class="text-center mb-xl">
        <h1 class="text-4xl font-bold gradient-text mb-md">LoRA Training</h1>
        <p class="text-lg text-secondary">Train your custom LoRA models with your own images</p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-2 gap-xl">
        <!-- Left: Configuration -->
        <div class="config-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Training Configuration</h2>

            <!-- Model Info -->
            <div class="form-group">
              <label class="label">Model Title *</label>
              <input
                v-model="title"
                type="text"
                class="input"
                placeholder="My Custom LoRA Model"
                :disabled="isTraining"
              />
            </div>

            <div class="form-group">
              <label class="label">Description</label>
              <textarea
                v-model="description"
                class="textarea"
                rows="3"
                placeholder="Describe your model..."
                :disabled="isTraining"
              ></textarea>
            </div>

            <!-- Additional Fields -->
            <div class="grid grid-cols-2 gap-md">
              <div class="form-group">
                <label class="label">Character Name</label>
                <input
                  v-model="characterName"
                  type="text"
                  class="input"
                  placeholder="e.g., Hatsune Miku"
                  :disabled="isTraining"
                />
              </div>

              <div class="form-group">
                <label class="label">Style</label>
                <input
                  v-model="style"
                  type="text"
                  class="input"
                  placeholder="e.g., Anime, Illustration"
                  :disabled="isTraining"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-md">
              <div class="form-group">
                <label class="label">Training Images Count</label>
                <input
                  v-model.number="trainingImagesCount"
                  type="number"
                  min="5"
                  max="200"
                  class="input"
                  :disabled="isTraining"
                />
              </div>

              <div class="form-group">
                <label class="label">Public</label>
                <select v-model="isPublic" class="input" :disabled="isTraining">
                  <option :value="false">Private</option>
                  <option :value="true">Public</option>
                </select>
              </div>
            </div>

            <!-- Hyperparameters -->
            <h3 class="text-lg font-semibold mb-md mt-lg">Training Hyperparameters</h3>

            <div class="grid grid-cols-2 gap-md">
              <div class="form-group">
                <label class="label">Learning Rate: {{ learningRate }}</label>
                <input
                  v-model.number="learningRate"
                  type="range"
                  min="0.00001"
                  max="0.001"
                  step="0.00001"
                  class="input"
                  :disabled="isTraining"
                />
              </div>

              <div class="form-group">
                <label class="label">Epochs: {{ epochs }}</label>
                <input
                  v-model.number="epochs"
                  type="range"
                  min="5"
                  max="50"
                  class="input"
                  :disabled="isTraining"
                />
              </div>

              <div class="form-group">
                <label class="label">LoRA Rank</label>
                <select v-model.number="loraRank" class="input" :disabled="isTraining">
                  <option :value="4">4</option>
                  <option :value="8">8</option>
                  <option :value="16">16</option>
                  <option :value="32">32</option>
                </select>
              </div>

              <div class="form-group">
                <label class="label">Base Model</label>
                <select v-model="baseModel" class="input" :disabled="isTraining">
                  <option value="stablediffusionapi/anything-v5">Anything V5</option>
                  <option value="runwayml/stable-diffusion-v1-5">SD 1.5</option>
                  <option value="stabilityai/stable-diffusion-2-1">SD 2.1</option>
                </select>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-md mt-lg">
              <button
                class="btn btn-primary flex-1"
                :disabled="isTraining"
                @click="startTraining"
              >
                {{ isTraining ? 'Training...' : 'Start Training' }}
              </button>
              <button
                v-if="isTraining"
                class="btn btn-secondary"
                @click="cancelTraining"
              >
                Cancel
              </button>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="card mt-md p-md" style="background: rgba(224, 224, 224, 0.1); border: 1px solid var(--text-secondary);">
              <p class="text-error text-sm">{{ error }}</p>
            </div>

            <!-- Progress -->
            <div v-if="isTraining" class="mt-lg">
              <div class="flex justify-between mb-sm">
                <span class="text-sm text-secondary">{{ statusMessage }}</span>
                <span class="text-sm font-semibold">Epoch {{ currentEpoch }} / {{ totalEpochs }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${(currentEpoch / totalEpochs) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Training History -->
        <div class="history-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Training History</h2>

            <div v-if="trainingHistory.length === 0" class="empty-state text-center py-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto mb-md" style="color: var(--text-muted);">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <p class="text-secondary">No training history yet</p>
              <p class="text-sm text-muted mt-sm">Start your first training to see it here</p>
            </div>

            <div v-else class="flex flex-col gap-md">
              <div v-for="training in trainingHistory" :key="training.id" class="card-sm">
                <div class="flex items-start justify-between mb-sm">
                  <div class="flex-1">
                    <h3 class="font-semibold mb-xs">Training Job #{{ training.id }}</h3>
                    <p class="text-sm text-secondary mb-sm">Model ID: {{ training.modelId }}</p>
                  </div>
                  <span class="badge" :style="getStatusColor(training.status)">
                    {{ training.status }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-sm text-sm mb-sm">
                  <div>
                    <span class="text-muted">Progress:</span>
                    <span class="text-secondary ml-xs">{{ training.currentEpoch }} / {{ training.totalEpochs }} epochs</span>
                  </div>
                  <div>
                    <span class="text-muted">Phase:</span>
                    <span class="text-secondary ml-xs">{{ training.phase || 'N/A' }}</span>
                  </div>
                  <div v-if="training.startedAt">
                    <span class="text-muted">Started:</span>
                    <span class="text-secondary ml-xs">{{ new Date(training.startedAt).toLocaleDateString() }}</span>
                  </div>
                  <div v-if="training.completedAt">
                    <span class="text-muted">Completed:</span>
                    <span class="text-secondary ml-xs">{{ new Date(training.completedAt).toLocaleDateString() }}</span>
                  </div>
                </div>

                <div v-if="training.errorMessage" class="text-sm text-error mb-sm">
                  Error: {{ training.errorMessage }}
                </div>

                <div class="flex gap-sm mt-md">
                  <router-link
                    v-if="training.status === 'COMPLETED'"
                    :to="`/models/${training.modelId}`"
                    class="btn btn-secondary btn-sm flex-1"
                  >
                    View Model
                  </router-link>
                  <button
                    v-if="training.status === 'FAILED' || training.status === 'COMPLETED'"
                    class="btn btn-ghost btn-sm"
                    @click="deleteTrainingJob(training.id)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.training-page {
  padding: var(--space-xl) var(--space-lg);
  min-height: calc(100vh - 200px);
}

.config-section,
.history-section {
  height: fit-content;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.badge {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

@media (max-width: 1024px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
