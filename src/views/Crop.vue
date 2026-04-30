<template>
  <div class="crop-page">
    <div v-if="!originalImage" class="upload-container">
      <UploadArea
        :multiple="false"
        title="上传图片进行裁剪"
        hint="支持 JPG、PNG、WebP 等格式"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">图片裁剪</h1>
        <button class="btn btn-secondary" @click="resetAll">
          重新上传
        </button>
      </div>

      <div class="workspace">
        <ImageCompare
          :original-image="originalImage"
          :processed-image="processedImage"
          :original-info="`${originalWidth} × ${originalHeight}`"
          :processed-info="`${cropWidth} × ${cropHeight}`"
        />
      </div>

      <div class="control-panel glass card">
        <div class="control-group">
          <label class="control-label">裁剪比例</label>
          <div class="aspect-options">
            <button 
              v-for="aspect in aspectRatios" 
              :key="aspect.value"
              class="aspect-btn"
              :class="{ active: aspectRatio === aspect.value }"
              @click="setAspectRatio(aspect.value)"
            >
              {{ aspect.label }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">旋转角度: {{ rotation }}°</label>
          <div class="rotate-controls">
            <button class="rotate-btn" @click="rotate(-90)">-90°</button>
            <button class="rotate-btn" @click="rotate(-45)">-45°</button>
            <button class="rotate-btn" @click="rotate(45)">+45°</button>
            <button class="rotate-btn" @click="rotate(90)">+90°</button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">镜像翻转</label>
          <div class="flip-controls">
            <button 
              class="flip-btn" 
              :class="{ active: flipX }"
              @click="flipX = !flipX; applyCrop()"
            >
              水平翻转
            </button>
            <button 
              class="flip-btn" 
              :class="{ active: flipY }"
              @click="flipY = !flipY; applyCrop()"
            >
              垂直翻转
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">精确尺寸设置</label>
          <div class="size-inputs">
            <div class="size-input-group">
              <label>宽度 (px)</label>
              <input 
                type="number" 
                v-model.number="cropWidth"
                min="10"
                :max="originalWidth"
                class="input"
                @change="applyCrop"
              />
            </div>
            <div class="size-input-group">
              <label>高度 (px)</label>
              <input 
                type="number" 
                v-model.number="cropHeight"
                min="10"
                :max="originalHeight"
                class="input"
                @change="applyCrop"
              />
            </div>
            <div class="size-input-group">
              <label>X 位置</label>
              <input 
                type="number" 
                v-model.number="cropX"
                min="0"
                :max="originalWidth - cropWidth"
                class="input"
                @change="applyCrop"
              />
            </div>
            <div class="size-input-group">
              <label>Y 位置</label>
              <input 
                type="number" 
                v-model.number="cropY"
                min="0"
                :max="originalHeight - cropHeight"
                class="input"
                @change="applyCrop"
              />
            </div>
          </div>
        </div>

        <div class="control-group actions-group">
          <button class="btn btn-secondary" @click="resetCrop">
            重置裁剪
          </button>
          <button class="btn btn-primary" @click="applyCrop">
            应用裁剪
          </button>
        </div>
      </div>

      <ActionBar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :has-image="!!originalImage"
        :has-processed-image="!!processedImage"
        @undo="handleUndo"
        @redo="handleRedo"
        @reset="resetCrop"
        @copy="handleCopy"
        @export="handleExport"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useImageStore } from '@/stores/image'
import { useHistoryStore } from '@/stores/history'
import { 
  dataURLToImage, 
  dataURLToBlob, 
  downloadBlob, 
  copyImageToClipboard,
  generateFilename
} from '@/utils/image'
import { cropImage, getAspectRatio, calculateCropBounds } from '@/utils/crop'
import UploadArea from '@/components/UploadArea.vue'
import ImageCompare from '@/components/ImageCompare.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImage = ref(null)
const processedImage = ref(null)
const originalWidth = ref(0)
const originalHeight = ref(0)
const imgElement = ref(null)

const cropX = ref(0)
const cropY = ref(0)
const cropWidth = ref(0)
const cropHeight = ref(0)
const aspectRatio = ref('free')
const rotation = ref(0)
const flipX = ref(false)
const flipY = ref(false)

const aspectRatios = [
  { label: '自由', value: 'free' },
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '3:2', value: '3:2' },
  { label: '9:16', value: '9:16' }
]

const canUndo = computed(() => imageStore.historyIndex > 0)
const canRedo = computed(() => imageStore.historyIndex < imageStore.history.length - 1)

const onFilesSelected = async (files) => {
  if (files.length === 0) return
  
  const file = files[0]
  originalImage.value = file.dataURL
  
  const img = await dataURLToImage(file.dataURL)
  imgElement.value = img
  originalWidth.value = img.width
  originalHeight.value = img.height
  
  cropX.value = 0
  cropY.value = 0
  cropWidth.value = img.width
  cropHeight.value = img.height
  rotation.value = 0
  flipX.value = false
  flipY.value = false
  
  imageStore.setOriginalImage(file.dataURL)
  processedImage.value = file.dataURL
  
  showToast('图片加载成功', 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const setAspectRatio = (value) => {
  aspectRatio.value = value
  
  if (value === 'free') {
    return
  }
  
  const ratio = getAspectRatio(value)
  if (ratio) {
    const maxWidth = originalWidth.value
    const maxHeight = originalHeight.value
    
    let newWidth = maxWidth
    let newHeight = maxWidth / ratio
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight
      newWidth = maxHeight * ratio
    }
    
    cropWidth.value = Math.floor(newWidth)
    cropHeight.value = Math.floor(newHeight)
    cropX.value = Math.floor((maxWidth - newWidth) / 2)
    cropY.value = Math.floor((maxHeight - newHeight) / 2)
    
    applyCrop()
  }
}

const rotate = (degrees) => {
  rotation.value = (rotation.value + degrees) % 360
  if (rotation.value < 0) rotation.value += 360
  applyCrop()
}

const applyCrop = async () => {
  if (!imgElement.value) return
  
  try {
    const result = await cropImage(imgElement.value, {
      x: cropX.value,
      y: cropY.value,
      width: cropWidth.value,
      height: cropHeight.value,
      rotation: rotation.value,
      flipX: flipX.value,
      flipY: flipY.value
    })
    
    processedImage.value = result.dataURL
    imageStore.setProcessedImage(result.dataURL)
    imageStore.saveToHistory()
    
  } catch (e) {
    console.error('Crop error:', e)
    showToast('裁剪失败', 'error')
  }
}

const resetCrop = () => {
  if (originalImage.value) {
    cropX.value = 0
    cropY.value = 0
    cropWidth.value = originalWidth.value
    cropHeight.value = originalHeight.value
    rotation.value = 0
    flipX.value = false
    flipY.value = false
    processedImage.value = originalImage.value
    imageStore.reset()
    showToast('已重置', 'info')
  }
}

const resetAll = () => {
  originalImage.value = null
  processedImage.value = null
  imgElement.value = null
  imageStore.clearAll()
}

const handleUndo = () => {
  if (imageStore.undo()) {
    processedImage.value = imageStore.processedImage
    showToast('已撤销', 'info')
  }
}

const handleRedo = () => {
  if (imageStore.redo()) {
    processedImage.value = imageStore.processedImage
    showToast('已重做', 'info')
  }
}

const handleCopy = async () => {
  if (!processedImage.value) {
    showToast('没有可复制的图片', 'warning')
    return
  }
  
  const success = await copyImageToClipboard(processedImage.value)
  if (success) {
    showToast('已复制到剪贴板', 'success')
  } else {
    showToast('复制失败', 'error')
  }
}

const handleExport = async () => {
  if (!processedImage.value) {
    showToast('没有可导出的图片', 'warning')
    return
  }
  
  try {
    const blob = await dataURLToBlob(processedImage.value)
    const filename = generateFilename('cropped', 'png')
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '图片裁剪',
      thumbnail: processedImage.value.slice(0, 500)
    })
    
    showToast('导出成功', 'success')
  } catch (e) {
    showToast('导出失败', 'error')
  }
}
</script>

<style scoped>
.crop-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.workspace {
  width: 100%;
}

.control-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.aspect-options,
.rotate-controls,
.flip-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.aspect-btn,
.rotate-btn,
.flip-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.aspect-btn:hover,
.rotate-btn:hover,
.flip-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.aspect-btn.active,
.flip-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.size-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.size-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.size-input-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.actions-group {
  flex-direction: row;
  gap: 12px;
}

@media (max-width: 768px) {
  .crop-page {
    gap: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .control-panel {
    padding: 16px;
    gap: 16px;
  }

  .size-inputs {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions-group {
    flex-direction: column;
  }

  .actions-group .btn {
    width: 100%;
  }
}
</style>
