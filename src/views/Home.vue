<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-emoji">🖼️</span>
          在线图片工具箱
        </h1>
        <p class="hero-subtitle">
          纯前端 Canvas 本地处理，无需上传服务器，保护您的图片隐私
        </p>
        <div class="hero-features">
          <span class="feature-tag">🔒 隐私保护</span>
          <span class="feature-tag">⚡ 极速处理</span>
          <span class="feature-tag">📱 全端适配</span>
          <span class="feature-tag">🎯 功能完整</span>
        </div>
      </div>
    </div>

    <div class="upload-section">
      <UploadArea
        :multiple="true"
        title="拖拽或点击上传图片"
        hint="支持 JPG、PNG、WebP、GIF，单张最大 50MB"
        @files-selected="onFilesSelected"
        @error="onUploadError"
      />
    </div>

    <div class="features-section">
      <h2 class="section-title">选择功能开始处理</h2>
      <div class="features-grid">
        <div 
          v-for="feature in features" 
          :key="feature.path"
          class="feature-card card glass"
          @click="goToFeature(feature.path)"
        >
          <div class="feature-icon" :style="{ background: feature.gradient }">
            <span class="icon-emoji">{{ feature.icon }}</span>
          </div>
          <div class="feature-info">
            <h3 class="feature-name">{{ feature.name }}</h3>
            <p class="feature-desc">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="historyStore.records.length > 0" class="history-section">
      <div class="history-header">
        <h2 class="section-title">历史记录</h2>
        <button class="btn btn-secondary btn-sm" @click="clearHistory">
          清空历史
        </button>
      </div>
      <div class="history-grid">
        <div 
          v-for="record in historyStore.records" 
          :key="record.id"
          class="history-card card glass"
        >
          <div class="history-preview">
            <img :src="record.thumbnail" :alt="record.functionName" />
          </div>
          <div class="history-info">
            <span class="history-function">{{ record.functionName }}</span>
            <span class="history-time">{{ formatTime(record.createdAt) }}</span>
          </div>
          <button class="history-remove" @click="removeRecord(record.id)">
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import UploadArea from '@/components/UploadArea.vue'

const router = useRouter()
const historyStore = useHistoryStore()
const showToast = inject('showToast')

const features = [
  {
    path: '/compress',
    name: '图片压缩',
    icon: '📦',
    description: '支持单张/批量压缩，多档位调节，实时大小对比',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    path: '/crop',
    name: '自由裁剪',
    icon: '✂️',
    description: '拖拽裁剪框、固定比例、旋转镜像、精准像素设置',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)'
  },
  {
    path: '/background',
    name: '换底色',
    icon: '🎨',
    description: '纯色、渐变、自定义图片三种背景替换方式',
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)'
  },
  {
    path: '/remove-bg',
    name: '智能抠图',
    icon: '🔮',
    description: '自动识别主体，边缘智能适配无白边毛刺',
    gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)'
  },
  {
    path: '/watermark',
    name: '加水印',
    icon: '📝',
    description: '文字/图片水印，多种排布模式，自定义样式',
    gradient: 'linear-gradient(135deg, #fa709a, #fee140)'
  },
  {
    path: '/remove-watermark',
    name: '去水印',
    icon: '🧹',
    description: '框选区域、画笔涂抹，智能修复背景纹理',
    gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)'
  }
]

onMounted(() => {
  historyStore.loadFromStorage()
})

const goToFeature = (path) => {
  router.push(path)
}

const onFilesSelected = (files) => {
  showToast(`已选择 ${files.length} 张图片，选择功能开始处理`, 'success')
}

const onUploadError = (invalidFiles) => {
  showToast(`部分文件上传失败：${invalidFiles[0]?.reason}`, 'error')
}

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const removeRecord = (id) => {
  historyStore.removeRecord(id)
  showToast('已删除记录', 'info')
}

const clearHistory = () => {
  historyStore.clearAll()
  showToast('已清空历史记录', 'info')
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero-section {
  text-align: center;
  padding: 24px 0;
}

.hero-content {
  max-width: 600px;
  margin: 0 auto;
}

.hero-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.title-emoji {
  font-size: 2.75rem;
}

.hero-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.6;
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.feature-tag {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  backdrop-filter: blur(10px);
}

.upload-section {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.features-section {
  width: 100%;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-emoji {
  font-size: 1.75rem;
}

.feature-info {
  flex: 1;
  min-width: 0;
}

.feature-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.history-section {
  width: 100%;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.history-card {
  position: relative;
  overflow: hidden;
  padding: 12px;
  cursor: pointer;
}

.history-preview {
  width: 100%;
  padding-bottom: 75%;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 8px;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
}

.history-preview img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-function {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.history-time {
  font-size: 11px;
  color: var(--text-light);
}

.history-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.history-card:hover .history-remove {
  opacity: 1;
}

@media (max-width: 768px) {
  .home {
    gap: 24px;
  }

  .hero-title {
    font-size: 1.75rem;
    flex-direction: column;
    gap: 8px;
  }

  .title-emoji {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 0.875rem;
  }

  .feature-tag {
    font-size: 12px;
    padding: 4px 12px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-card {
    padding: 16px;
  }

  .feature-icon {
    width: 48px;
    height: 48px;
  }

  .icon-emoji {
    font-size: 1.5rem;
  }

  .section-title {
    font-size: 1.125rem;
  }

  .history-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .history-remove {
    opacity: 1;
  }
}
</style>
