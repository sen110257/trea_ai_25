<template>
  <div class="image-compare">
    <div class="compare-panel">
      <div class="panel-header">
        <span class="panel-title">原图</span>
        <span v-if="originalInfo" class="panel-info">{{ originalInfo }}</span>
      </div>
      <div class="image-container panel-image">
        <img v-if="originalImage" :src="originalImage" alt="Original" />
        <div v-else class="placeholder">
          <span class="placeholder-icon">📷</span>
          <span class="placeholder-text">暂无图片</span>
        </div>
      </div>
    </div>

    <div class="compare-divider">
      <div class="divider-icon">➡️</div>
    </div>

    <div class="compare-panel">
      <div class="panel-header">
        <span class="panel-title">处理后</span>
        <span v-if="processedInfo" class="panel-info">{{ processedInfo }}</span>
      </div>
      <div class="image-container panel-image">
        <img v-if="processedImage" :src="processedImage" alt="Processed" />
        <div v-else class="placeholder">
          <span class="placeholder-icon">🎨</span>
          <span class="placeholder-text">调整参数预览效果</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  originalImage: {
    type: String,
    default: null
  },
  processedImage: {
    type: String,
    default: null
  },
  originalInfo: {
    type: String,
    default: null
  },
  processedInfo: {
    type: String,
    default: null
  }
})
</script>

<style scoped>
.image-compare {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

.compare-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-weight: 600;
  color: var(--text-primary);
}

.panel-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.panel-image {
  flex: 1;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.panel-image img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-light);
}

.placeholder-icon {
  font-size: 3rem;
}

.placeholder-text {
  font-size: 14px;
}

.compare-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.divider-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .image-compare {
    flex-direction: column;
    gap: 16px;
  }

  .compare-panel {
    min-height: 200px;
  }

  .panel-image {
    min-height: 200px;
  }

  .panel-image img {
    max-height: 300px;
  }

  .compare-divider {
    transform: rotate(90deg);
  }

  .divider-icon {
    font-size: 1.25rem;
  }

  .placeholder-icon {
    font-size: 2rem;
  }
}
</style>
