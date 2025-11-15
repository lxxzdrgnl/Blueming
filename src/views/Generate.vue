<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api, type LoraModel } from '../services/api';

const models = ref<LoraModel[]>([]);
const selectedModelId = ref<number | null>(null);
const prompt = ref('');
const negativePrompt = ref('lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality');
const steps = ref(30);
const guidanceScale = ref(7.5);
const numImages = ref(1);
const seed = ref<number | undefined>(undefined);

const isGenerating = ref(false);
const generatedImages = ref<string[]>([]);
const error = ref('');
const currentStep = ref(0);
const totalSteps = ref(0);
const statusMessage = ref('');

let eventSource: EventSource | null = null;

onMounted(async () => {
  await loadMyModels();
});

const loadMyModels = async () => {
  try {
    const response = await api.models.getMyModels(0, 100);
    models.value = response.data.content.filter(m => m.status === 'COMPLETED');
  } catch (err) {
    console.error('Failed to load models:', err);
  }
};

const startGeneration = async () => {
  if (!selectedModelId.value) {
    error.value = 'Please select a model first';
    return;
  }

  if (!prompt.value.trim()) {
    error.value = 'Please enter a prompt';
    return;
  }

  try {
    isGenerating.value = true;
    error.value = '';
    generatedImages.value = [];
    currentStep.value = 0;
    totalSteps.value = steps.value;

    const response = await api.generation.generateImage({
      modelId: selectedModelId.value,
      prompt: prompt.value,
      negativePrompt: negativePrompt.value,
      steps: steps.value,
      guidanceScale: guidanceScale.value,
      seed: seed.value,
    });

    statusMessage.value = 'Generation started...';

    // Connect to SSE for progress
    connectToProgressStream();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start generation';
    isGenerating.value = false;
  }
};

const connectToProgressStream = () => {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = api.generation.streamGenerationProgress((data) => {
    if (data.status === 'IN_PROGRESS') {
      currentStep.value = data.current_step || 0;
      totalSteps.value = data.total_steps || steps.value;
      statusMessage.value = data.message || 'Generating...';
    } else if (data.status === 'SUCCESS') {
      isGenerating.value = false;
      generatedImages.value = data.image_urls || [];
      statusMessage.value = 'Generation completed!';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    } else if (data.status === 'FAILED') {
      isGenerating.value = false;
      error.value = data.message || 'Generation failed';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    }
  });
};

const downloadImage = (url: string, index: number) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = `generated-${Date.now()}-${index}.png`;
  link.click();
};

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
  }
});
</script>

<template>
  <div class="generate-page">
    <div class="container-sm">
      <!-- Header -->
      <div class="text-center mb-xl">
        <h1 class="text-4xl font-bold gradient-text mb-md">Image Generation</h1>
        <p class="text-lg text-secondary">Create amazing images with your trained LoRA models</p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-2 gap-xl">
        <!-- Left: Configuration -->
        <div class="config-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Configuration</h2>

            <!-- Model Selection -->
            <div class="form-group">
              <label class="label">Select Model</label>
              <select v-model="selectedModelId" class="input" :disabled="isGenerating">
                <option :value="null">Choose a model...</option>
                <option v-for="model in models" :key="model.id" :value="model.id">
                  {{ model.title }}
                </option>
              </select>
            </div>

            <!-- Prompt -->
            <div class="form-group">
              <label class="label">Prompt</label>
              <textarea
                v-model="prompt"
                class="textarea"
                rows="4"
                placeholder="1girl, beautiful, detailed face, high quality..."
                :disabled="isGenerating"
              ></textarea>
            </div>

            <!-- Negative Prompt -->
            <div class="form-group">
              <label class="label">Negative Prompt</label>
              <textarea
                v-model="negativePrompt"
                class="textarea"
                rows="3"
                placeholder="lowres, bad anatomy..."
                :disabled="isGenerating"
              ></textarea>
            </div>

            <!-- Parameters -->
            <div class="grid grid-cols-2 gap-md">
              <div class="form-group">
                <label class="label">Steps: {{ steps }}</label>
                <input
                  v-model.number="steps"
                  type="range"
                  min="10"
                  max="100"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Guidance Scale: {{ guidanceScale }}</label>
                <input
                  v-model.number="guidanceScale"
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Number of Images</label>
                <input
                  v-model.number="numImages"
                  type="number"
                  min="1"
                  max="4"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Seed (optional)</label>
                <input
                  v-model.number="seed"
                  type="number"
                  class="input"
                  placeholder="Random"
                  :disabled="isGenerating"
                />
              </div>
            </div>

            <!-- Generate Button -->
            <button
              class="btn btn-primary w-full mt-lg"
              :disabled="isGenerating || !selectedModelId"
              @click="startGeneration"
            >
              <svg v-if="isGenerating" class="loading mr-sm" width="20" height="20" viewBox="0 0 24 24"></svg>
              {{ isGenerating ? 'Generating...' : 'Generate Images' }}
            </button>

            <!-- Error Message -->
            <div v-if="error" class="card mt-md p-md" style="background: rgba(224, 224, 224, 0.1); border: 1px solid var(--text-secondary);">
              <p class="text-error text-sm">{{ error }}</p>
            </div>

            <!-- Progress -->
            <div v-if="isGenerating" class="mt-lg">
              <div class="flex justify-between mb-sm">
                <span class="text-sm text-secondary">{{ statusMessage }}</span>
                <span class="text-sm font-semibold">{{ currentStep }} / {{ totalSteps }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${(currentStep / totalSteps) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Generated Images -->
        <div class="results-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Generated Images</h2>

            <div v-if="generatedImages.length === 0" class="empty-state text-center py-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto mb-md" style="color: var(--text-muted);">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p class="text-secondary">No images generated yet</p>
              <p class="text-sm text-muted mt-sm">Configure your settings and click Generate</p>
            </div>

            <div v-else class="images-grid">
              <div v-for="(url, index) in generatedImages" :key="index" class="image-item">
                <img :src="url" :alt="`Generated ${index + 1}`" class="img-cover rounded" />
                <div class="image-actions mt-sm flex gap-sm">
                  <button class="btn btn-secondary btn-sm flex-1" @click="downloadImage(url, index)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
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
.generate-page {
  padding: var(--space-xl) var(--space-lg);
  min-height: calc(100vh - 200px);
}

.config-section,
.results-section {
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

.images-grid {
  display: grid;
  gap: var(--space-lg);
}

.image-item {
  background: var(--bg-hover);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
}

.image-item img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
}

@media (max-width: 1024px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
