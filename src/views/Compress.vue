<template>
  <div class="compress-page">
    <div v-if="!originalImages.length" class="upload-container">
      <UploadArea
        :multiple="true"
        title="上传图片进行压缩"
        hint="支持单张/批量上传，JPG、PNG、WebP 格式"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">图片压缩</h1>
        <button class="btn btn-secondary" @click="clearAll">
          重新上传
        </button>
      </div>

      <div class="control-panel glass card">
        <div class="control-group">
          <label class="control-label">
            压缩质量: <span class="control-value">{{ Math.round(quality * 100) }}%</span>
          </label>
          <input 
            type="range" 
            v-model.number="quality" 
            min="0.1" 
            max="1" 
            step="0.05"
            class="range"
            @input="updateAllPreview"
          />
          <div class="quality-presets">
            <button 
              v-for="preset in qualityPresets" 
              :key="preset.value"
              class="preset-btn"
              :class="{ active: Math.abs(quality - preset.value) < 0.01 }"
              @click="quality = preset.value; updateAllPreview()"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">导出格式</label>
          <div class="format-options">
            <button 
              v-for="format in exportFormats" 
              :key="format.value"
              class="format-btn"
              :class="{ active: exportFormat === format.value }"
              @click="exportFormat = format.value; updateAllPreview()"
            >
              {{ format.label }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">最大尺寸限制</label>
          <div class="size-options">
            <button 
              v-for="size in sizeLimits" 
              :key="size.value"
              class="size-btn"
              :class="{ active: maxSize === size.value }"
              @click="maxSize = size.value; updateAllPreview()"
            >
              {{ size.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="images-list">
        <div 
          v-for="(item, index) in processedImages" 
          :key="index"
          class="image-item glass card"
        >
          <div class="image-compare">
            <div class="compare-panel">
              <div class="panel-header">
                <span class="panel-title">原图</span>
              </div>
              <div class="image-container panel-image">
                <img :src="item.original.dataURL" alt="Original" />
              </div>
              <div class="panel-info">
                <span class="info-name">{{ item.original.name }}</span>
                <span class="info-size">{{ item.original.size }}</span>
              </div>
            </div>

            <div class="compare-arrow">➡️</div>

            <div class="compare-panel">
              <div class="panel-header">
                <span class="panel-title">压缩后</span>
              </div>
              <div class="image-container panel-image">
                <img v-if="item.processed?.dataURL" :src="item.processed.dataURL" alt="Processed" />
                <div v-else class="placeholder">处理中...</div>
              </div>
              <div class="panel-info">
                <span class="info-size" :class="{ savings: item.savings > 0 }">
                  {{ item.processedSize || '计算中...' }}
                </span>
                <span v-if="item.savings > 0" class="info-savings">
                  节省 {{ item.savingsPercent }}%
                </span>
              </div>
            </div>
          </div>

          <div class="item-actions">
            <button class="btn btn-secondary btn-sm" @click="copySingle(index)">
              复制
            </button>
            <button class="btn btn-success btn-sm" @click="downloadSingle(index)">
              下载
            </button>
            <button class="btn btn-secondary btn-sm" @click="removeItem(index)">
              删除
            </button>
          </div>
        </div>
      </div>

      <ActionBar
        :can-undo="false"
        :can-redo="false"
        :has-image="originalImages.length > 0"
        :has-processed-image="processedImages.some(i => i.processed)"
        @reset="clearAll"
        @copy="copyAll"
        @export="downloadAll"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import { useImageStore } from '@/stores/image'
import { useHistoryStore } from '@/stores/history'
import { 
  dataURLToImage, 
  dataURLToBlob, 
  downloadBlob, 
  copyImageToClipboard,
  generateFilename
} from '@/utils/image'
import { compressImage } from '@/utils/compress'
import UploadArea from '@/components/UploadArea.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImages = ref([])
const processedImages = ref([])
const quality = ref(0.8)
const exportFormat = ref('image/jpeg')
const maxSize = ref(0)

const qualityPresets = [
  { label: '低质量', value: 0.3 },
  { label: '中等', value: 0.6 },
  { label: '高质量', value: 0.8 },
  { label: '无损', value: 1 }
]

const exportFormats = [
  { label: 'JPG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' }
]

const sizeLimits = [
  { label: '不限制', value: 0 },
  { label: '1920px', value: 1920 },
  { label: '1280px', value: 1280 },
  { label: '800px', value: 800 }
]

const onFilesSelected = async (files) => {
  originalImages.value = files.map(f => ({
    file: f.file,
    dataURL: f.dataURL,
    name: f.name,
    size: f.size,
    bytes: f.file.size
  }))

  processedImages.value = originalImages.value.map(img => ({
    original: img,
    processed: null,
    processedSize: '',
    savings: 0,
    savingsPercent: 0
  }))

  await updateAllPreview()
  showToast(`已加载 ${files.length} 张图片`, 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const updateAllPreview = async () => {
  for (let i = 0; i < processedImages.value.length; i++) {
    await processImage(i)
  }
}

const processImage = async (index) => {
  const item = processedImages.value[index]
  if (!item.original) return

  try {
    const img = await dataURLToImage(item.original.dataURL)
    
    const options = {
      quality: quality.value,
      format: exportFormat.value
    }

    if (maxSize.value > 0) {
      options.maxWidth = maxSize.value
      options.maxHeight = maxSize.value
    }

    const result = await compressImage(img, options)
    
    const processedBlob = await dataURLToBlob(result.dataURL, exportFormat.value, quality.value)
    const processedBytes = processedBlob.size
    const originalBytes = item.original.bytes
    const savings = originalBytes - processedBytes
    const savingsPercent = Math.round((savings / originalBytes) * 100)

    processedImages.value[index] = {
      ...item,
      processed: result,
      processedSize: formatBytes(processedBytes),
      savings,
      savingsPercent
    }
  } catch (e) {
    console.error('Compress error:', e)
    showToast('图片压缩失败', 'error')
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const removeItem = (index) => {
  processedImages.value.splice(index, 1)
  originalImages.value.splice(index, 1)
  showToast('已移除图片', 'info')
}

const clearAll = () => {
  originalImages.value = []
  processedImages.value = []
  quality.value = 0.8
  exportFormat.value = 'image/jpeg'
  maxSize.value = 0
}

const downloadSingle = async (index) => {
  const item = processedImages.value[index]
  if (!item?.processed?.dataURL) return

  try {
    const blob = await dataURLToBlob(item.processed.dataURL, exportFormat.value, quality.value)
    const ext = exportFormat.value.split('/')[1]
    const filename = generateFilename('compressed', ext)
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '图片压缩',
      thumbnail: item.processed.dataURL.slice(0, 500)
    })
    
    showToast('下载成功', 'success')
  } catch (e) {
    showToast('下载失败', 'error')
  }
}

const downloadAll = async () => {
  const items = processedImages.value.filter(i => i.processed?.dataURL)
  if (items.length === 0) {
    showToast('没有可下载的图片', 'warning')
    return
  }

  for (let i = 0; i < items.length; i++) {
    await downloadSingle(processedImages.value.indexOf(items[i]))
    await new Promise(r => setTimeout(r, 200))
  }
}

const copySingle = async (index) => {
  const item = processedImages.value[index]
  if (!item?.processed?.dataURL) return

  const success = await copyImageToClipboard(item.processed.dataURL)
  if (success) {
    showToast('已复制到剪贴板', 'success')
  } else {
    showToast('复制失败，请重试', 'error')
  }
}

const copyAll = async () => {
  const items = processedImages.value.filter(i => i.processed?.dataURL)
  if (items.length === 0) {
    showToast('没有可复制的图片', 'warning')
    return
  }

  if (items.length === 1) {
    await copySingle(processedImages.value.indexOf(items[0]))
  } else {
    showToast('批量图片请分别复制', 'info')
  }
}
</script>

<style scoped>
.compress-page {
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

.control-panel {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.control-value {
  color: var(--primary-color);
  font-weight: 600;
}

.quality-presets,
.format-options,
.size-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn,
.format-btn,
.size-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preset-btn:hover,
.format-btn:hover,
.size-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.preset-btn.active,
.format-btn.active,
.size-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.images-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image-item {
  padding: 16px;
}

.image-compare {
  display: flex;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 16px;
}

.compare-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  margin-bottom: 0;
}

.panel-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.panel-image {
  min-height: 150px;
  max-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  border: 1px solid var(--border-color);
  border-top: none;
  overflow: hidden;
}

.panel-image img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.placeholder {
  color: var(--text-light);
  font-size: 14px;
}

.panel-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 0;
  font-size: 12px;
}

.info-name {
  color: var(--text-primary);
  font-weight: 500;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-size {
  color: var(--text-secondary);
}

.info-size.savings {
  color: var(--success-color);
  font-weight: 600;
}

.info-savings {
  color: var(--success-color);
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.compare-arrow {
  display: flex;
  align-items: center;
  color: var(--primary-color);
  opacity: 0.5;
  font-size: 1.25rem;
}

.item-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .compress-page {
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
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
  }

  .image-compare {
    flex-direction: column;
    gap: 12px;
  }

  .compare-arrow {
    transform: rotate(90deg);
    align-self: center;
  }

  .panel-image {
    min-height: 120px;
    max-height: 180px;
  }

  .panel-image img {
    max-height: 150px;
  }

  .item-actions {
    flex-wrap: wrap;
  }

  .btn-sm {
    flex: 1;
    min-width: auto;
  }
}
</style>
