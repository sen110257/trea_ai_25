<template>
  <transition name="fade">
    <div class="toast" :class="`toast-${type}`" @click="$emit('close')">
      <span class="toast-icon">{{ icon }}</span>
      <span class="toast-message">{{ message }}</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info'
  },
  message: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '⚠'
    default:
      return 'ℹ'
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 80px;
  right: 20px;
  padding: 16px 24px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  background: #d1fae5;
  color: #065f46;
}

.toast-error {
  background: #fee2e2;
  color: #991b1b;
}

.toast-info {
  background: #dbeafe;
  color: #1e40af;
}

.toast-warning {
  background: #fef3c7;
  color: #92400e;
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast-message {
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .toast {
    top: 100px;
    left: 16px;
    right: 16px;
    transform: none;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
</style>
