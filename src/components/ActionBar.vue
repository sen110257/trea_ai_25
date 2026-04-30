<template>
  <div class="action-bar">
    <button 
      class="btn btn-secondary" 
      :disabled="!canUndo"
      @click="$emit('undo')"
    >
      <span class="btn-icon">↩</span>
      <span class="btn-text">撤销</span>
    </button>

    <button 
      class="btn btn-secondary" 
      :disabled="!canRedo"
      @click="$emit('redo')"
    >
      <span class="btn-icon">↪</span>
      <span class="btn-text">重做</span>
    </button>

    <button 
      class="btn btn-secondary" 
      :disabled="!hasImage"
      @click="$emit('reset')"
    >
      <span class="btn-icon">🔄</span>
      <span class="btn-text">重置</span>
    </button>

    <div class="action-divider"></div>

    <button 
      class="btn btn-primary" 
      :disabled="!hasProcessedImage"
      @click="$emit('copy')"
    >
      <span class="btn-icon">📋</span>
      <span class="btn-text">复制图片</span>
    </button>

    <button 
      class="btn btn-success" 
      :disabled="!hasProcessedImage"
      @click="$emit('export')"
    >
      <span class="btn-icon">💾</span>
      <span class="btn-text">导出保存</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  },
  hasImage: {
    type: Boolean,
    default: false
  },
  hasProcessedImage: {
    type: Boolean,
    default: false
  }
})

defineEmits(['undo', 'redo', 'reset', 'copy', 'export'])
</script>

<style scoped>
.action-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: 100;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 4px;
}

.btn {
  padding: 10px 18px;
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-size: 13px;
}

@media (max-width: 768px) {
  .action-bar {
    width: calc(100% - 32px);
    flex-wrap: wrap;
    justify-content: center;
    bottom: 16px;
    padding: 12px 16px;
    gap: 8px;
  }

  .btn {
    padding: 8px 14px;
    font-size: 12px;
    flex: 1;
    min-width: auto;
  }

  .btn-icon {
    font-size: 0.875rem;
  }

  .btn-text {
    font-size: 11px;
  }

  .action-divider {
    display: none;
  }
}
</style>
