<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api, type GenerateConfig } from '../services/api';

const config = ref<GenerateConfig>({
  modelId: 1, // Placeholder modelId, needs to be dynamically selected
  prompt: 'sks, 1girl, black hair, long hair, black and white manga style',
  steps: 40,
  guidanceScale: 7.5,
  negativePrompt: 'ugly, blurry, low quality, distorted',
  seed: undefined,
});

const isGenerating = ref(false);
const generatedImages = ref<string[]>([]);
const errorMessage = ref('');
const selectedImage = ref<string | null>(null);
const statusMessage = ref('');
const currentImage = ref(0);
const totalImages = ref(0);
const currentStep = ref(0);
const totalSteps = ref(0);
let eventSource: EventSource | null = null;
let heartbeatTimer: number | null = null;
const HEARTBEAT_TIMEOUT = 60000; // 60초 동안 업데이트가 없으면 연결 끊김으로 간주

const generateImages = async () => {
  try {
    isGenerating.value = true;
    errorMessage.value = '';
    statusMessage.value = '';
    generatedImages.value = [];
    currentImage.value = 0;
    totalImages.value = 0;
    currentStep.value = 0;
    totalSteps.value = 0;

    // Start image generation using the API service
    const response = await api.generation.generateImage(config.value);

    statusMessage.value = response.message;

    // Connect to SSE stream for real-time progress
    connectToStream();
  } catch (error) {
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    isGenerating.value = false;
  }
};

const resetHeartbeat = () => {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }

  heartbeatTimer = window.setTimeout(() => {
    // 60초 동안 업데이트가 없으면 연결 끊김
    handleConnectionLost();
  }, HEARTBEAT_TIMEOUT);
};

const handleConnectionLost = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  isGenerating.value = false;
  errorMessage.value = 'Connection to server lost. The server may have been stopped.';
  statusMessage.value = 'Generation interrupted - server connection lost';
};

const connectToStream = () => {
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }

  // Clear any existing heartbeat timer
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }

  eventSource = new EventSource('http://127.0.0.1:8000/generate/stream');

  eventSource.onopen = () => {
    console.log('SSE connection established');
    resetHeartbeat();
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      statusMessage.value = data.message || '';

      // Reset heartbeat timer on every message
      resetHeartbeat();

      // Update progress information
      if (data.progress) {
        currentImage.value = data.progress.current_image || 0;
        totalImages.value = data.progress.total_images || 0;
        currentStep.value = data.progress.current_step || 0;
        totalSteps.value = data.progress.total_steps || 0;
      }

      // Handle completion
      if (data.status === 'SUCCESS') {
        isGenerating.value = false;
        if (data.image_urls) {
          generatedImages.value = data.image_urls;
        }
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (heartbeatTimer) {
          clearTimeout(heartbeatTimer);
          heartbeatTimer = null;
        }
      }

      // Handle failure
      if (data.status === 'FAIL') {
        isGenerating.value = false;
        errorMessage.value = data.message || 'Image generation failed';
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (heartbeatTimer) {
          clearTimeout(heartbeatTimer);
          heartbeatTimer = null;
        }
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    handleConnectionLost();
  };
};

const openImageModal = (url: string) => {
  selectedImage.value = url;
};

const closeImageModal = () => {
  selectedImage.value = null;
};

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeImageModal();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
});
</script>

<template>
  <div class="generate-panel">
    <h2>Image Generation</h2>

    <div class="form-group">
      <label for="prompt">Prompt:</label>
      <textarea
        id="prompt"
        v-model="config.prompt"
        rows="3"
        placeholder="sks, 1girl, black hair, manga style..."
        :disabled="isGenerating"
      />
    </div>

    <div class="form-group">
      <label for="negative-prompt">Negative Prompt:</label>
      <textarea
        id="negative-prompt"
        v-model="config.negativePrompt"
        rows="2"
        placeholder="ugly, blurry, low quality..."
        :disabled="isGenerating"
      />
    </div>

    <!-- Removed lora_path as it's not part of GenerateConfig -->

    <div class="form-row">
      <!-- Removed num_images as it's not part of GenerateConfig -->
      <div class="form-group">
        <label for="steps">Steps:</label>
        <input
          id="steps"
          v-model.number="config.steps"
          type="number"
          min="10"
          max="100"
          :disabled="isGenerating"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="guidance">Guidance Scale:</label>
        <input
          id="guidance"
          v-model.number="config.guidanceScale"
          type="number"
          min="1"
          max="20"
          step="0.5"
          :disabled="isGenerating"
        />
      </div>

      <div class="form-group">
        <label for="seed">Seed (optional):</label>
        <input
          id="seed"
          v-model.number="config.seed"
          type="number"
          placeholder="Random"
          :disabled="isGenerating"
        />
      </div>
    </div>

    <button
      class="btn btn-primary"
      @click="generateImages"
      :disabled="isGenerating"
    >
      {{ isGenerating ? 'Generating...' : 'Generate Images' }}
    </button>

    <div v-if="statusMessage && isGenerating" class="status-message active">
      {{ statusMessage }}
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Progress Bars -->
    <div v-if="isGenerating && totalImages > 0" class="progress-section">
      <div class="progress-item">
        <div class="progress-label">
          <span>Image Progress</span>
          <span class="progress-text">{{ currentImage }} / {{ totalImages }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(currentImage / totalImages) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="progress-item" v-if="totalSteps > 0">
        <div class="progress-label">
          <span>Step Progress</span>
          <span class="progress-text">{{ currentStep }} / {{ totalSteps }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill secondary"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="generatedImages.length > 0" class="image-gallery">
      <h3>Generated Images:</h3>
      <div class="gallery-grid">
        <div
          v-for="(url, index) in generatedImages"
          :key="index"
          class="image-item"
          @click="openImageModal(url)"
        >
          <img :src="url" :alt="`Generated ${index + 1}`" />
          <div class="image-overlay">
            <span>Click to view</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <Teleport to="body">
      <div v-if="selectedImage" class="modal-overlay" @click="closeImageModal">
        <div class="modal-content" @click.stop>
          <button class="modal-close" @click="closeImageModal">&times;</button>
          <img :src="selectedImage" alt="Full size image" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.generate-panel {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #2a2a3e;
}

h2 {
  margin-top: 0;
  margin-bottom: 28px;
  color: #e0e0e0;
  font-size: 28px;
  font-weight: 600;
}

h3 {
  margin-top: 32px;
  margin-bottom: 20px;
  color: #b0b0c0;
  font-size: 22px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #b0b0c0;
  font-size: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

input[type="text"],
input[type="number"],
textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
  transition: all 0.2s;
  font-family: inherit;
  background: #0f0f1e;
  color: #e0e0e0;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

input:disabled,
textarea:disabled {
  background: #1a1a2e;
  cursor: not-allowed;
  opacity: 0.5;
}

.btn {
  padding: 16px 32px;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  background: #2a2a3e;
  color: #606070;
  cursor: not-allowed;
  box-shadow: none;
}

.error-message {
  margin-top: 20px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 15px;
}

.image-gallery {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px solid #2a2a3e;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.image-item {
  background: #0f0f1e;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.image-item:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-item img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 12px;
}

.image-overlay span {
  color: white;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  background: rgba(99, 102, 241, 0.8);
  border-radius: 8px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  animation: scaleIn 0.2s ease;
}

.modal-content img {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: -15px;
  right: -15px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  font-size: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  transition: all 0.3s;
}

.modal-close:hover {
  background: #dc2626;
  transform: rotate(90deg);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.status-message {
  margin-top: 20px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 4px solid #6366f1;
  border-radius: 8px;
  color: #a5b4fc;
  font-size: 15px;
}

.status-message.active {
  background: rgba(251, 191, 36, 0.1);
  border-left-color: #fbbf24;
  color: #fcd34d;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.progress-section {
  margin-top: 24px;
  padding: 20px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.progress-item {
  margin-bottom: 20px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #b0b0c0;
  font-size: 14px;
  font-weight: 600;
}

.progress-text {
  color: #6366f1;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

.progress-fill.secondary {
  background: linear-gradient(90deg, #ec4899 0%, #f43f5e 100%);
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
