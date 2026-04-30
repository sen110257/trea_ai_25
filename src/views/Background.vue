<template>
  <div class="background-page">
    <div v-if="!originalImage" class="upload-container">
      <UploadArea
        :multiple="false"
        title="上传图片更换底色"
        hint="支持透明背景图片，边缘智能适配"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">图片换底色</h1>
        <button class="btn btn-secondary" @click="resetAll">
          重新上传
        </button>
      </div>

      <div class="workspace">
        <ImageCompare
          :original-image="originalImage"
          :processed-image="processedImage"
          original-info="原图"
          processed-info="处理后"
        />
      </div>

      <div class="control-panel glass card">
        <div class="control-group">
          <label class="control-label">背景类型</label>
          <div class="type-options">
            <button 
              v-for="type in backgroundTypes" 
              :key="type.value"
              class="type-btn"
              :class="{ active: backgroundType === type.value }"
              @click="backgroundType = type.value; applyBackground()"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div v-if="backgroundType === 'solid'" class="control-group">
          <label class="control-label">选择颜色</label>
          <div class="color-picker-container">
            <div 
              v-for="color in presetColors" 
              :key="color.value"
              class="color-swatch"
              :class="{ active: solidColor === color.value }"
              :style="{ background: color.value }"
              @click="solidColor = color.value; applyBackground()"
            >
              <span v-if="solidColor === color.value" class="color-check">✓</span>
            </div>
            <div class="color-input-group">
              <input 
                type="color" 
                v-model="solidColor"
                class="color-picker"
                @input="applyBackground()"
              />
              <input 
                type="text" 
                v-model="solidColor"
                class="input color-hex"
                @change="applyBackground()"
              />
            </div>
          </div>
        </div>

        <div v-if="backgroundType === 'gradient'" class="control-group">
          <label class="control-label">渐变颜色</label>
          <div class="gradient-picker">
            <div class="gradient-colors">
              <div class="gradient-color-group">
                <label>起始色</label>
                <input 
                  type="color" 
                  v-model="gradientStart"
                  class="color-picker"
                  @input="applyBackground()"
                />
                <input 
                  type="text" 
                  v-model="gradientStart"
                  class="input color-hex"
                  @change="applyBackground()"
                />
              </div>
              <div class="gradient-arrow">➡️</div>
              <div class="gradient-color-group">
                <label>结束色</label>
                <input 
                  type="color" 
                  v-model="gradientEnd"
                  class="color-picker"
                  @input="applyBackground()"
                />
                <input 
                  type="text" 
                  v-model="gradientEnd"
                  class="input color-hex"
                  @change="applyBackground()"
                />
              </div>
            </div>
            <div class="gradient-presets">
              <div 
                v-for="preset in gradientPresets" 
                :key="preset.label"
                class="gradient-preset"
                :style="{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }"
                @click="setGradientPreset(preset)"
              >
              </div>
            </div>
          </div>
        </div>

        <div v-if="backgroundType === 'image'" class="control-group">
          <label class="control-label">自定义背景图片</label>
          <div class="custom-image-upload">
            <div 
              v-if="backgroundImage"
              class="custom-image-preview"
              @click="triggerBackgroundUpload"
            >
              <img :src="backgroundImage" alt="Background" />
              <span class="change-text">更换图片</span>
            </div>
            <div 
              v-else
              class="upload-placeholder"
              @click="triggerBackgroundUpload"
            >
              <span class="upload-icon">🖼️</span>
              <span>点击上传背景图片</span>
            </div>
            <input 
              ref="bgFileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onBackgroundFileChange"
            />
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">边缘平滑度</label>
          <input 
            type="range" 
            v-model.number="edgeSmooth"
            min="0"
            max="10"
            step="1"
            class="range"
            @input="applyBackground()"
          />
          <div class="range-labels">
            <span>清晰</span>
            <span>平滑</span>
          </div>
        </div>
      </div>

      <ActionBar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :has-image="!!originalImage"
        :has-processed-image="!!processedImage"
        @undo="handleUndo"
        @redo="handleRedo"
        @reset="resetBackground"
        @copy="handleCopy"
        @export="handleExport"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useImageStore } from '@/stores/image'
import { useHistoryStore } from '@/stores/history'
import { 
  fileToDataURL,
  dataURLToImage, 
  dataURLToBlob, 
  downloadBlob, 
  copyImageToClipboard,
  generateFilename
} from '@/utils/image'
import { replaceBackground } from '@/utils/background'
import UploadArea from '@/components/UploadArea.vue'
import ImageCompare from '@/components/ImageCompare.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImage = ref(null)
const processedImage = ref(null)
const imgElement = ref(null)
const bgFileInput = ref(null)

const initFromGlobalImage = async () => {
  if (imageStore.hasGlobalImage && !originalImage.value) {
    const dataURL = imageStore.globalImage
    originalImage.value = dataURL
    
    const img = await dataURLToImage(dataURL)
    imgElement.value = img
    
    imageStore.setOriginalImage(dataURL)
    applyBackground()
    
    showToast('已载入全局图片', 'success')
  }
}

onMounted(() => {
  initFromGlobalImage()
})

watch(() => imageStore.globalImage, () => {
  if (!originalImage.value) {
    initFromGlobalImage()
  }
}, { immediate: false })

const backgroundType = ref('solid')
const solidColor = ref('#ffffff')
const gradientStart = ref('#667eea')
const gradientEnd = ref('#764ba2')
const backgroundImage = ref(null)
const edgeSmooth = ref(2)

const backgroundTypes = [
  { label: '纯色', value: 'solid' },
  { label: '渐变', value: 'gradient' },
  { label: '图片', value: 'image' }
]

const presetColors = [
  { label: '白色', value: '#ffffff' },
  { label: '黑色', value: '#000000' },
  { label: '红色', value: '#ef4444' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '绿色', value: '#22c55e' },
  { label: '紫色', value: '#a855f7' },
  { label: '黄色', value: '#eab308' },
  { label: '粉色', value: '#ec4899' }
]

const gradientPresets = [
  { label: '清新', start: '#a8edea', end: '#fed6e3' },
  { label: '阳光', start: '#ffecd2', end: '#fcb69f' },
  { label: '深邃', start: '#667eea', end: '#764ba2' },
  { label: '自然', start: '#43e97b', end: '#38f9d7' },
  { label: '浪漫', start: '#f093fb', end: '#f5576c' },
  { label: '科技', start: '#4facfe', end: '#00f2fe' }
]

const canUndo = computed(() => imageStore.historyIndex > 0)
const canRedo = computed(() => imageStore.historyIndex < imageStore.history.length - 1)

const onFilesSelected = async (files) => {
  if (files.length === 0) return
  
  const file = files[0]
  originalImage.value = file.dataURL
  
  const img = await dataURLToImage(file.dataURL)
  imgElement.value = img
  
  imageStore.setOriginalImage(file.dataURL)
  imageStore.setGlobalImage(file.dataURL, file.name, file.file?.size)
  applyBackground()
  
  showToast('图片加载成功', 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const triggerBackgroundUpload = () => {
  bgFileInput.value?.click()
}

const onBackgroundFileChange = async (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const file = e.target.files[0]
    backgroundImage.value = await fileToDataURL(file)
    applyBackground()
  }
}

const setGradientPreset = (preset) => {
  gradientStart.value = preset.start
  gradientEnd.value = preset.end
  applyBackground()
}

const applyBackground = async () => {
  if (!imgElement.value) return
  
  try {
    const options = {
      type: backgroundType.value,
      color: solidColor.value,
      gradientStart: gradientStart.value,
      gradientEnd: gradientEnd.value,
      backgroundImage: backgroundImage.value,
      edgeSmooth: edgeSmooth.value
    }
    
    const result = await replaceBackground(imgElement.value, options)
    
    processedImage.value = result.dataURL
    imageStore.setProcessedImage(result.dataURL)
    imageStore.saveToHistory()
    
  } catch (e) {
    console.error('Background replace error:', e)
    showToast('处理失败', 'error')
  }
}

const resetBackground = () => {
  if (originalImage.value) {
    backgroundType.value = 'solid'
    solidColor.value = '#ffffff'
    gradientStart.value = '#667eea'
    gradientEnd.value = '#764ba2'
    backgroundImage.value = null
    edgeSmooth.value = 2
    processedImage.value = originalImage.value
    imageStore.reset()
    showToast('已重置', 'info')
  }
}

const resetAll = () => {
  originalImage.value = null
  processedImage.value = null
  imgElement.value = null
  backgroundImage.value = null
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
    const filename = generateFilename('background', 'png')
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '换底色',
      fullImage: processedImage.value
    })
    
    showToast('导出成功', 'success')
  } catch (e) {
    showToast('导出失败', 'error')
  }
}
</script>

<style scoped>
.background-page {
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

.type-options {
  display: flex;
  gap: 8px;
}

.type-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.type-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.color-picker-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  position: relative;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
}

.color-check {
  color: white;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.color-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
}

.color-hex {
  width: 100px;
  padding: 8px 12px;
  font-size: 13px;
}

.gradient-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gradient-colors {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.gradient-color-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gradient-color-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.gradient-arrow {
  color: var(--primary-color);
  font-size: 1.25rem;
  align-self: flex-end;
  margin-bottom: 8px;
}

.gradient-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gradient-preset {
  width: 60px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.gradient-preset:hover {
  transform: scale(1.05);
  border-color: var(--primary-color);
}

.custom-image-upload {
  width: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}

.upload-placeholder:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon {
  font-size: 2rem;
}

.custom-image-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: var(--radius-md);
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
  cursor: pointer;
}

.custom-image-preview img {
  max-width: 200px;
  max-height: 120px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.change-text {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.custom-image-preview:hover .change-text {
  opacity: 1;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .background-page {
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

  .type-options {
    flex-wrap: wrap;
  }

  .type-btn {
    flex: 1;
    min-width: auto;
    text-align: center;
  }

  .gradient-colors {
    flex-direction: column;
    align-items: stretch;
  }

  .gradient-arrow {
    align-self: center;
    margin: 0;
    transform: rotate(90deg);
  }

  .color-input-group {
    width: 100%;
  }

  .color-hex {
    flex: 1;
  }
}
</style>
