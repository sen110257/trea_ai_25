<template>
  <div class="remove-bg-page">
    <div v-if="!originalImage" class="upload-container">
      <UploadArea
        :multiple="false"
        title="上传图片进行智能抠图"
        hint="自动识别主体，边缘智能适配"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">智能抠图</h1>
        <button class="btn btn-secondary" @click="resetAll">
          重新上传
        </button>
      </div>

      <div class="workspace">
        <ImageCompare
          :original-image="originalImage"
          :processed-image="processedImage"
          original-info="原图"
          processed-info="抠图后"
        />
      </div>

      <div class="control-panel glass card">
        <div class="control-group">
          <label class="control-label">抠图模式</label>
          <div class="mode-options">
            <button 
              v-for="mode in modes" 
              :key="mode.value"
              class="mode-btn"
              :class="{ active: modeType === mode.value }"
              @click="modeType = mode.value; applyRemoveBg()"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div v-if="modeType === 'auto'" class="control-group">
          <label class="control-label">
            敏感度: <span class="control-value">{{ Math.round(threshold * 100) }}%</span>
          </label>
          <input 
            type="range" 
            v-model.number="threshold"
            min="0.1"
            max="0.9"
            step="0.05"
            class="range"
            @input="applyRemoveBg()"
          />
          <div class="range-tips">
            <span>更多保留</span>
            <span>更多去除</span>
          </div>
        </div>

        <div v-if="modeType === 'color'" class="control-group">
          <label class="control-label">选择要去除的颜色</label>
          <div class="color-selector">
            <div class="color-picker-container">
              <div 
                v-for="color in bgColors" 
                :key="color.value"
                class="color-swatch"
                :class="{ active: targetColor === color.value }"
                :style="{ background: color.value }"
                @click="targetColor = color.value; applyRemoveBg()"
              >
                <span v-if="targetColor === color.value" class="color-check">✓</span>
              </div>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="targetColor"
                  class="color-picker"
                  @input="applyRemoveBg()"
                />
                <input 
                  type="text" 
                  v-model="targetColor"
                  class="input color-hex"
                  @change="applyRemoveBg()"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="modeType === 'color'" class="control-group">
          <label class="control-label">
            颜色容差: <span class="control-value">{{ colorTolerance }}</span>
          </label>
          <input 
            type="range" 
            v-model.number="colorTolerance"
            min="0"
            max="100"
            step="5"
            class="range"
            @input="applyRemoveBg()"
          />
        </div>

        <div class="control-group">
          <label class="control-label">
            边缘平滑: <span class="control-value">{{ edgeSmooth }}px</span>
          </label>
          <input 
            type="range" 
            v-model.number="edgeSmooth"
            min="0"
            max="10"
            step="1"
            class="range"
            @input="applyRemoveBg()"
          />
        </div>

        <div class="control-group actions-group">
          <button class="btn btn-secondary" @click="resetParams">
            重置参数
          </button>
          <button class="btn btn-primary" @click="applyRemoveBg">
            重新抠图
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
        @reset="resetParams"
        @copy="handleCopy"
        @export="handleExport"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useImageStore } from '@/stores/image'
import { useHistoryStore } from '@/stores/history'
import { 
  dataURLToImage, 
  dataURLToBlob, 
  downloadBlob, 
  copyImageToClipboard,
  generateFilename
} from '@/utils/image'
import { removeBackground } from '@/utils/removeBg'
import UploadArea from '@/components/UploadArea.vue'
import ImageCompare from '@/components/ImageCompare.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImage = ref(null)
const processedImage = ref(null)
const imgElement = ref(null)

const modeType = ref('auto')
const threshold = ref(0.5)
const targetColor = ref('#ffffff')
const colorTolerance = ref(30)
const edgeSmooth = ref(2)

const modes = [
  { label: '自动识别', value: 'auto' },
  { label: '指定颜色', value: 'color' }
]

const bgColors = [
  { label: '白色', value: '#ffffff' },
  { label: '黑色', value: '#000000' },
  { label: '绿色', value: '#00ff00' },
  { label: '蓝色', value: '#0000ff' },
  { label: '红色', value: '#ff0000' }
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
  await applyRemoveBg()
  
  showToast('图片加载成功，正在自动抠图...', 'info')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const applyRemoveBg = async () => {
  if (!imgElement.value) return
  
  try {
    const options = {
      method: modeType.value,
      threshold: threshold.value,
      edgeSmooth: edgeSmooth.value,
      colorKey: modeType.value === 'color' ? targetColor.value : null,
      colorTolerance: colorTolerance.value
    }
    
    const result = await removeBackground(imgElement.value, options)
    
    processedImage.value = result.dataURL
    imageStore.setProcessedImage(result.dataURL)
    imageStore.saveToHistory()
    
  } catch (e) {
    console.error('Remove background error:', e)
    showToast('抠图失败', 'error')
  }
}

const resetParams = () => {
  modeType.value = 'auto'
  threshold.value = 0.5
  targetColor.value = '#ffffff'
  colorTolerance.value = 30
  edgeSmooth.value = 2
  
  if (originalImage.value) {
    processedImage.value = originalImage.value
    imageStore.reset()
    applyRemoveBg()
    showToast('已重置参数', 'info')
  }
}

const resetAll = () => {
  originalImage.value = null
  processedImage.value = null
  imgElement.value = null
  imageStore.clearAll()
  resetParams()
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
    const blob = await dataURLToBlob(processedImage.value, 'image/png', 1)
    const filename = generateFilename('removed-bg', 'png')
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '智能抠图',
      thumbnail: processedImage.value.slice(0, 500)
    })
    
    showToast('导出成功', 'success')
  } catch (e) {
    showToast('导出失败', 'error')
  }
}
</script>

<style scoped>
.remove-bg-page {
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

.control-value {
  color: var(--primary-color);
  font-weight: 600;
}

.mode-options {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mode-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.color-selector {
  width: 100%;
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

.range-tips {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

.actions-group {
  flex-direction: row;
  gap: 12px;
}

@media (max-width: 768px) {
  .remove-bg-page {
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

  .mode-options {
    flex-wrap: wrap;
  }

  .mode-btn {
    flex: 1;
    min-width: auto;
    text-align: center;
  }

  .actions-group {
    flex-direction: column;
  }

  .actions-group .btn {
    width: 100%;
  }
}
</style>
