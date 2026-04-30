<template>
  <div 
    class="upload-area"
    :class="{ dragover: isDragover }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="triggerUpload"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      style="display: none"
      @change="onFileChange"
    />
    
    <div class="upload-content">
      <div class="upload-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="upload-text">
        <p class="upload-title">{{ title }}</p>
        <p class="upload-hint">{{ hint }}</p>
      </div>
      <div class="upload-tips">
        <span class="upload-tip">点击选择图片</span>
        <span class="upload-tip">拖拽到此处</span>
        <span class="upload-tip">Ctrl+V 粘贴</span>
      </div>
    </div>

    <div v-if="previewImages.length > 0" class="upload-preview">
      <div v-for="(img, index) in previewImages" :key="index" class="preview-item">
        <img :src="img.url" :alt="img.name" class="preview-image" />
        <div class="preview-info">
          <span class="preview-name">{{ img.name }}</span>
          <span class="preview-size">{{ img.size }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { fileToDataURL, formatFileSize } from '@/utils/image'

const props = defineProps({
  accept: {
    type: String,
    default: 'image/*'
  },
  multiple: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '上传图片'
  },
  hint: {
    type: String,
    default: '支持 JPG、PNG、WebP、GIF 等格式'
  },
  maxSize: {
    type: Number,
    default: 50 * 1024 * 1024
  }
})

const emit = defineEmits(['files-selected', 'error'])

const fileInput = ref(null)
const isDragover = ref(false)
const previewImages = ref([])

const handleFiles = async (files) => {
  const fileArray = Array.from(files)
  
  const validFiles = []
  const invalidFiles = []

  for (const file of fileArray) {
    if (!file.type.startsWith('image/')) {
      invalidFiles.push({ name: file.name, reason: '不是有效的图片文件' })
      continue
    }

    if (file.size > props.maxSize) {
      invalidFiles.push({ name: file.name, reason: `文件大小超过 ${formatFileSize(props.maxSize)}` })
      continue
    }

    try {
      const dataURL = await fileToDataURL(file)
      validFiles.push({
        file,
        dataURL,
        name: file.name,
        size: formatFileSize(file.size)
      })
    } catch (e) {
      invalidFiles.push({ name: file.name, reason: '文件读取失败' })
    }
  }

  if (invalidFiles.length > 0) {
    emit('error', invalidFiles)
  }

  if (validFiles.length > 0) {
    previewImages.value = validFiles.map(f => ({
      url: f.dataURL,
      name: f.name,
      size: f.size
    }))
    emit('files-selected', validFiles)
  }
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const onFileChange = (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files)
    e.target.value = ''
  }
}

const onDragOver = () => {
  isDragover.value = true
}

const onDragLeave = () => {
  isDragover.value = false
}

const onDrop = (e) => {
  isDragover.value = false
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files)
  }
}

const onPaste = async (e) => {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        handleFiles([file])
        break
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('paste', onPaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
})

watch(() => props.multiple, () => {
  previewImages.value = []
})
</script>

<style scoped>
.upload-area {
  position: relative;
  padding: 40px 24px;
  text-align: center;
  transition: all var(--transition-fast);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  width: 64px;
  height: 64px;
  color: var(--primary-color);
  opacity: 0.6;
}

.upload-icon svg {
  width: 100%;
  height: 100%;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 14px;
  color: var(--text-secondary);
}

.upload-tips {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.upload-tip {
  font-size: 13px;
  color: var(--text-light);
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: var(--radius-sm);
}

.upload-preview {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
  overflow-x: auto;
  padding: 8px 0;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  min-width: 100px;
}

.preview-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.preview-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.preview-name {
  font-size: 12px;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-size {
  font-size: 11px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .upload-area {
    padding: 24px 16px;
    min-height: 160px;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
  }

  .upload-title {
    font-size: 1rem;
  }

  .upload-tips {
    gap: 8px;
  }

  .upload-tip {
    font-size: 12px;
    padding: 3px 8px;
  }
}
</style>
