<template>
  <div class="remove-watermark-page">
    <div v-if="!originalImage" class="upload-container">
      <UploadArea
        :multiple="false"
        title="上传图片去除水印"
        hint="支持框选区域和画笔涂抹两种方式"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">智能去水印</h1>
        <button class="btn btn-secondary" @click="resetAll">
          重新上传
        </button>
      </div>

      <div class="workspace">
        <div class="editor-container glass card">
          <div class="editor-header">
            <div class="editor-tools">
              <button 
                v-for="tool in tools" 
                :key="tool.value"
                class="tool-btn"
                :class="{ active: activeTool === tool.value }"
                @click="setActiveTool(tool.value)"
              >
                <span class="tool-icon">{{ tool.icon }}</span>
                <span class="tool-label">{{ tool.label }}</span>
              </button>
            </div>
            <div class="editor-options" v-if="activeTool === 'brush'">
              <label class="option-label">
                画笔大小: {{ brushSize }}px
              </label>
              <input 
                type="range" 
                v-model.number="brushSize"
                min="5"
                max="100"
                step="5"
                class="range"
              />
            </div>
          </div>

          <div 
            class="editor-canvas"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="startTouchDrawing"
            @touchmove="touchDraw"
            @touchend="stopDrawing"
          >
            <div class="canvas-wrapper">
              <canvas 
                ref="mainCanvas"
                class="main-canvas"
              ></canvas>
              <canvas 
                ref="overlayCanvas"
                class="overlay-canvas"
              ></canvas>
            </div>
          </div>

          <div class="editor-actions">
            <button class="btn btn-secondary" @click="clearSelections">
              清除选区
            </button>
            <button class="btn btn-primary" @click="applyRemove">
              去除水印
            </button>
          </div>
        </div>

        <div v-if="processedImage" class="result-preview glass card">
          <div class="result-header">
            <span class="result-title">处理结果</span>
            <div class="result-actions">
              <button class="btn btn-secondary btn-sm" @click="handleCopy">
                复制
              </button>
              <button class="btn btn-success btn-sm" @click="handleExport">
                下载
              </button>
            </div>
          </div>
          <div class="result-image image-container">
            <img :src="processedImage" alt="Result" />
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
        @reset="resetAll"
        @copy="handleCopy"
        @export="handleExport"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch, nextTick } from 'vue'
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
import { removeWatermark } from '@/utils/removeWatermark'
import UploadArea from '@/components/UploadArea.vue'
import ActionBar from '@/components/ActionBar.vue'

const showToast = inject('showToast')
const imageStore = useImageStore()
const historyStore = useHistoryStore()

const originalImage = ref(null)
const processedImage = ref(null)
const imgElement = ref(null)
const mainCanvas = ref(null)
const overlayCanvas = ref(null)

const activeTool = ref('select')
const brushSize = ref(20)

const selections = ref([])
const brushStrokes = ref([])
const currentStroke = ref(null)
const isDrawing = ref(false)
const selectionStart = ref(null)

const tools = [
  { label: '框选', value: 'select', icon: '⬜' },
  { label: '画笔', value: 'brush', icon: '🖌️' }
]

const canUndo = computed(() => imageStore.historyIndex > 0)
const canRedo = computed(() => imageStore.historyIndex < imageStore.history.length - 1)

let mainCtx = null
let overlayCtx = null
let canvasWidth = 0
let canvasHeight = 0
let displayScale = 1
let offsetX = 0
let offsetY = 0

const onFilesSelected = async (files) => {
  if (files.length === 0) return
  
  const file = files[0]
  originalImage.value = file.dataURL
  
  const img = await dataURLToImage(file.dataURL)
  imgElement.value = img
  
  imageStore.setOriginalImage(file.dataURL)
  
  await nextTick()
  initCanvas()
  
  showToast('图片加载成功，请选择需要去除的区域', 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const initCanvas = () => {
  if (!mainCanvas.value || !overlayCanvas.value || !imgElement.value) return
  
  const img = imgElement.value
  const container = mainCanvas.value.parentElement
  const maxWidth = container.clientWidth
  const maxHeight = 500
  
  canvasWidth = img.width
  canvasHeight = img.height
  
  const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight, 1)
  displayScale = ratio
  const displayWidth = Math.floor(canvasWidth * displayScale)
  const displayHeight = Math.floor(canvasHeight * displayScale)
  
  mainCanvas.value.width = canvasWidth
  mainCanvas.value.height = canvasHeight
  mainCanvas.value.style.width = displayWidth + 'px'
  mainCanvas.value.style.height = displayHeight + 'px'
  
  overlayCanvas.value.width = canvasWidth
  overlayCanvas.value.height = canvasHeight
  overlayCanvas.value.style.width = displayWidth + 'px'
  overlayCanvas.value.style.height = displayHeight + 'px'
  
  mainCtx = mainCanvas.value.getContext('2d')
  overlayCtx = overlayCanvas.value.getContext('2d')
  
  mainCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  mainCtx.drawImage(img, 0, 0)
  
  clearOverlay()
}

const clearOverlay = () => {
  if (!overlayCtx) return
  overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.3)'
  overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.8)'
  overlayCtx.lineWidth = 2
  
  for (const sel of selections.value) {
    overlayCtx.fillRect(sel.x, sel.y, sel.width, sel.height)
    overlayCtx.strokeRect(sel.x, sel.y, sel.width, sel.height)
  }
  
  overlayCtx.lineCap = 'round'
  overlayCtx.lineJoin = 'round'
  
  for (const stroke of brushStrokes.value) {
    if (stroke.points.length < 2) continue
    
    overlayCtx.beginPath()
    overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
    overlayCtx.lineWidth = stroke.size
    overlayCtx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    for (let i = 1; i < stroke.points.length; i++) {
      const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2
      const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2
      overlayCtx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc)
    }
    
    overlayCtx.stroke()
  }
}

const setActiveTool = (tool) => {
  activeTool.value = tool
}

const getCanvasCoords = (e) => {
  const rect = overlayCanvas.value.getBoundingClientRect()
  let clientX, clientY
  
  if (e.touches) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  
  return {
    x: (clientX - rect.left) / displayScale,
    y: (clientY - rect.top) / displayScale
  }
}

const startDrawing = (e) => {
  if (activeTool.value === 'select') {
    const coords = getCanvasCoords(e)
    selectionStart.value = coords
    isDrawing.value = true
  } else if (activeTool.value === 'brush') {
    const coords = getCanvasCoords(e)
    currentStroke.value = {
      points: [coords],
      size: brushSize.value
    }
    isDrawing.value = true
  }
}

const startTouchDrawing = (e) => {
  e.preventDefault()
  startDrawing(e)
}

const draw = (e) => {
  if (!isDrawing.value) return
  
  const coords = getCanvasCoords(e)
  
  if (activeTool.value === 'select' && selectionStart.value) {
    clearOverlay()
    
    overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.2)'
    overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.8)'
    overlayCtx.lineWidth = 2
    
    const x = Math.min(selectionStart.value.x, coords.x)
    const y = Math.min(selectionStart.value.y, coords.y)
    const width = Math.abs(coords.x - selectionStart.value.x)
    const height = Math.abs(coords.y - selectionStart.value.y)
    
    overlayCtx.fillRect(x, y, width, height)
    overlayCtx.strokeRect(x, y, width, height)
  } else if (activeTool.value === 'brush' && currentStroke.value) {
    currentStroke.value.points.push(coords)
    clearOverlay()
  }
}

const touchDraw = (e) => {
  e.preventDefault()
  draw(e)
}

const stopDrawing = (e) => {
  if (!isDrawing.value) return
  
  if (activeTool.value === 'select' && selectionStart.value) {
    const coords = e.touches ? 
      getCanvasCoords({ touches: [{ clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY }] }) :
      getCanvasCoords(e)
    
    const x = Math.min(selectionStart.value.x, coords.x)
    const y = Math.min(selectionStart.value.y, coords.y)
    const width = Math.abs(coords.x - selectionStart.value.x)
    const height = Math.abs(coords.y - selectionStart.value.y)
    
    if (width > 10 && height > 10) {
      selections.value.push({ x, y, width, height })
    }
    
    selectionStart.value = null
  } else if (activeTool.value === 'brush' && currentStroke.value) {
    if (currentStroke.value.points.length > 1) {
      brushStrokes.value.push({ ...currentStroke.value })
    }
    currentStroke.value = null
  }
  
  isDrawing.value = false
  clearOverlay()
}

const clearSelections = () => {
  selections.value = []
  brushStrokes.value = []
  clearOverlay()
  showToast('已清除所有选区', 'info')
}

const applyRemove = async () => {
  if (selections.value.length === 0 && brushStrokes.value.length === 0) {
    showToast('请先选择需要去除的区域', 'warning')
    return
  }
  
  if (!imgElement.value) return
  
  try {
    showToast('正在处理，请稍候...', 'info')
    
    const options = {
      selections: selections.value,
      brushStrokes: brushStrokes.value,
      mode: selections.value.length > 0 ? 'selection' : 'brush'
    }
    
    const result = await removeWatermark(imgElement.value, options)
    
    processedImage.value = result.dataURL
    imageStore.setProcessedImage(result.dataURL)
    imageStore.saveToHistory()
    
    clearSelections()
    showToast('水印去除成功', 'success')
    
  } catch (e) {
    console.error('Remove watermark error:', e)
    showToast('处理失败，请重试', 'error')
  }
}

const resetAll = () => {
  originalImage.value = null
  processedImage.value = null
  imgElement.value = null
  selections.value = []
  brushStrokes.value = []
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
    const filename = generateFilename('removed-watermark', 'png')
    downloadBlob(blob, filename)
    
    historyStore.addRecord({
      functionName: '去水印',
      thumbnail: processedImage.value.slice(0, 500)
    })
    
    showToast('导出成功', 'success')
  } catch (e) {
    showToast('导出失败', 'error')
  }
}

onMounted(() => {
  window.addEventListener('resize', () => {
    if (imgElement.value) {
      initCanvas()
    }
  })
})
</script>

<style scoped>
.remove-watermark-page {
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.editor-tools {
  display: flex;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tool-btn.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-color: transparent;
}

.tool-icon {
  font-size: 1rem;
}

.editor-options {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.editor-canvas {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: crosshair;
}

.canvas-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 500px;
}

.main-canvas,
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  image-rendering: auto;
}

.overlay-canvas {
  z-index: 1;
}

.editor-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.result-preview {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.result-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 13px;
}

.result-image {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-image img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

@media (max-width: 768px) {
  .remove-watermark-page {
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

  .editor-container {
    padding: 16px;
  }

  .editor-header {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-tools {
    justify-content: center;
  }

  .tool-btn {
    flex: 1;
    justify-content: center;
  }

  .editor-options {
    justify-content: center;
  }

  .editor-actions {
    justify-content: stretch;
  }

  .editor-actions .btn {
    flex: 1;
  }

  .result-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .result-actions {
    width: 100%;
  }

  .result-actions .btn {
    flex: 1;
  }
}
</style>
