<template>
  <div class="watermark-page">
    <div v-if="!originalImage" class="upload-container">
      <UploadArea
        :multiple="false"
        title="上传图片添加水印"
        hint="支持文字水印和图片水印"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">图片加水印</h1>
        <button class="btn btn-secondary" @click="resetAll">
          重新上传
        </button>
      </div>

      <div class="workspace">
        <ImageCompare
          :original-image="originalImage"
          :processed-image="processedImage"
          original-info="原图"
          processed-info="带水印"
        />
      </div>

      <div class="control-panel glass card">
        <div class="control-group">
          <label class="control-label">水印类型</label>
          <div class="type-options">
            <button 
              v-for="type in watermarkTypes" 
              :key="type.value"
              class="type-btn"
              :class="{ active: watermarkType === type.value }"
              @click="watermarkType = type.value; applyWatermark()"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div v-if="watermarkType === 'text'" class="control-group">
          <label class="control-label">水印文字</label>
          <input 
            type="text" 
            v-model="watermarkText"
            class="input"
            placeholder="请输入水印文字"
            @input="applyWatermark()"
          />
        </div>

        <div v-if="watermarkType === 'text'" class="control-group">
          <label class="control-label">字体设置</label>
          <div class="font-settings">
            <div class="font-group">
              <label>字体</label>
              <select v-model="fontFamily" class="select input" @change="applyWatermark()">
                <option value="Arial">Arial</option>
                <option value="Microsoft YaHei">微软雅黑</option>
                <option value="SimHei">黑体</option>
                <option value="SimSun">宋体</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
            </div>
            <div class="font-group">
              <label>字号: {{ fontSize }}px</label>
              <input 
                type="range" 
                v-model.number="fontSize"
                min="12"
                max="200"
                step="2"
                class="range"
                @input="applyWatermark()"
              />
            </div>
            <div class="font-group">
              <label>颜色</label>
              <input 
                type="color" 
                v-model="textColor"
                class="color-picker"
                @input="applyWatermark()"
              />
              <input 
                type="text" 
                v-model="textColor"
                class="input color-hex"
                @change="applyWatermark()"
              />
            </div>
          </div>
        </div>

        <div v-if="watermarkType === 'image'" class="control-group">
          <label class="control-label">水印图片</label>
          <div class="image-upload">
            <div 
              v-if="watermarkImageData"
              class="image-preview"
              @click="triggerWatermarkUpload"
            >
              <img :src="watermarkImageData" alt="Watermark" />
              <span class="change-text">更换图片</span>
            </div>
            <div 
              v-else
              class="upload-placeholder"
              @click="triggerWatermarkUpload"
            >
              <span class="upload-icon">🖼️</span>
              <span>点击上传水印图片</span>
            </div>
            <input 
              ref="wmFileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onWatermarkFileChange"
            />
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">排布模式</label>
          <div class="mode-options">
            <button 
              v-for="mode in layoutModes" 
              :key="mode.value"
              class="mode-btn"
              :class="{ active: layoutMode === mode.value }"
              @click="layoutMode = mode.value; applyWatermark()"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div v-if="layoutMode === 'fixed'" class="control-group">
          <label class="control-label">固定位置</label>
          <div class="position-options">
            <button 
              v-for="pos in positions" 
              :key="pos.value"
              class="position-btn"
              :class="{ active: fixedPosition === pos.value }"
              @click="fixedPosition = pos.value; applyWatermark()"
            >
              {{ pos.label }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">
            透明度: <span class="control-value">{{ Math.round(opacity * 100) }}%</span>
          </label>
          <input 
            type="range" 
            v-model.number="opacity"
            min="0.05"
            max="1"
            step="0.05"
            class="range"
            @input="applyWatermark()"
          />
        </div>

        <div class="control-group">
          <label class="control-label">
            缩放比例: <span class="control-value">{{ Math.round(scale * 100) }}%</span>
          </label>
          <input 
            type="range" 
            v-model.number="scale"
            min="0.1"
            max="2"
            step="0.1"
            class="range"
            @input="applyWatermark()"
          />
        </div>

        <div class="control-group">
          <label class="control-label">
            旋转角度: <span class="control-value">{{ rotation }}°</span>
          </label>
          <input 
            type="range" 
            v-model.number="rotation"
            min="-180"
            max="180"
            step="5"
            class="range"
            @input="applyWatermark()"
          />
        </div>

        <div v-if="layoutMode === 'tile'" class="control-group">
          <label class="control-label">
            平铺间距: <span class="control-value">{{ spacing }}px</span>
          </label>
          <input 
            type="range" 
            v-model.number="spacing"
            min="10"
            max="200"
            step="10"
            class="range"
            @input="applyWatermark()"
          />
        </div>

        <div class="control-group actions-group">
          <button class="btn btn-secondary" @click="resetParams">
            重置参数
          </button>
          <button class="btn btn-primary" @click="applyWatermark">
            应用水印
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
  fileToDataURL,
  dataURLToImage, 
  dataURLToBlob, 
  downloadBlob, 
  copyImageToClipboard,
  generateFilename
} from '@/utils/image'
import { addWatermark } from '@/utils/watermark'
import UploadArea from '@/components/UploadArea.vue'
import ImageCompare from '@/components/ImageCompare.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImage = ref(null)
const processedImage = ref(null)
const imgElement = ref(null)
const wmFileInput = ref(null)

const watermarkType = ref('text')
const watermarkText = ref('示例水印')
const fontFamily = ref('Arial')
const fontSize = ref(48)
const textColor = ref('#000000')
const watermarkImageData = ref(null)

const layoutMode = ref('tile')
const fixedPosition = ref('center')
const opacity = ref(0.3)
const scale = ref(1)
const rotation = ref(0)
const spacing = ref(50)

const watermarkTypes = [
  { label: '文字水印', value: 'text' },
  { label: '图片水印', value: 'image' }
]

const layoutModes = [
  { label: '铺满平铺', value: 'tile' },
  { label: '自适应', value: 'fit' },
  { label: '固定位置', value: 'fixed' }
]

const positions = [
  { label: '左上', value: 'top-left' },
  { label: '右上', value: 'top-right' },
  { label: '左下', value: 'bottom-left' },
  { label: '右下', value: 'bottom-right' },
  { label: '居中', value: 'center' }
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
  applyWatermark()
  
  showToast('图片加载成功', 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const triggerWatermarkUpload = () => {
  wmFileInput.value?.click()
}

const onWatermarkFileChange = async (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const file = e.target.files[0]
    watermarkImageData.value = await fileToDataURL(file)
    applyWatermark()
    showToast('水印图片加载成功', 'success')
  }
}

const applyWatermark = async () => {
  if (!imgElement.value) return
  
  if (watermarkType.value === 'image' && !watermarkImageData.value) {
    showToast('请先上传水印图片', 'warning')
    return
  }
  
  try {
    const options = {
      type: watermarkType.value,
      text: watermarkText.value,
      textFont: fontFamily.value,
      textSize: fontSize.value,
      textColor: textColor.value,
      textOpacity: opacity.value,
      imageWatermark: watermarkImageData.value,
      mode: layoutMode.value,
      position: fixedPosition.value,
      rotation: rotation.value,
      scale: scale.value,
      spacing: spacing.value,
      opacity: opacity.value
    }
    
    const result = await addWatermark(imgElement.value, options)
    
    processedImage.value = result.dataURL
    imageStore.setProcessedImage(result.dataURL)
    imageStore.saveToHistory()
    
  } catch (e) {
    console.error('Watermark error:', e)
    showToast('添加水印失败', 'error')
  }
}

const resetParams = () => {
  watermarkType.value = 'text'
  watermarkText.value = '示例水印'
  fontFamily.value = 'Arial'
  fontSize.value = 48
  textColor.value = '#000000'
  watermarkImageData.value = null
  layoutMode.value = 'tile'
  fixedPosition.value = 'center'
  opacity.value = 0.3
  scale.value = 1
  rotation.value = 0
  spacing.value = 50
  
  if (originalImage.value) {
    processedImage.value = originalImage.value
    imageStore.reset()
    applyWatermark()
    showToast('已重置参数', 'info')
  }
}

const resetAll = () => {
  originalImage.value = null
  processedImage.value = null
  imgElement.value = null
  watermarkImageData.value = null
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
    const blob = await dataURLToBlob(processedImage.value)
    const filename = generateFilename('watermarked', 'png')
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '加水印',
      thumbnail: processedImage.value.slice(0, 500)
    })
    
    showToast('导出成功', 'success')
  } catch (e) {
    showToast('导出失败', 'error')
  }
}
</script>

<style scoped>
.watermark-page {
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

.type-options,
.mode-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-btn,
.mode-btn,
.position-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-btn:hover,
.mode-btn:hover,
.position-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.type-btn.active,
.mode-btn.active,
.position-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.font-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.font-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.font-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.color-hex {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
}

.color-picker {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 0;
}

.image-upload {
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

.image-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: var(--radius-md);
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
  cursor: pointer;
}

.image-preview img {
  max-width: 150px;
  max-height: 100px;
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

.image-preview:hover .change-text {
  opacity: 1;
}

.position-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.actions-group {
  flex-direction: row;
  gap: 12px;
}

@media (max-width: 768px) {
  .watermark-page {
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

  .font-settings {
    grid-template-columns: 1fr;
  }

  .position-options {
    grid-template-columns: repeat(3, 1fr);
  }

  .actions-group {
    flex-direction: column;
  }

  .actions-group .btn {
    width: 100%;
  }
}
</style>
