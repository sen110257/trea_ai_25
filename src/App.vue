<template>
  <div class="app">
    <header class="header glass">
      <div class="header-content">
        <router-link to="/" class="logo">
          <span class="logo-icon">🖼️</span>
          <span class="logo-text">图片工具箱</span>
        </router-link>
        <nav class="nav">
          <router-link 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="nav-link"
            :class="{ active: $route.path === item.path }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-text">{{ item.name }}</span>
          </router-link>
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <Toast v-if="toast.show" :type="toast.type" :message="toast.message" @close="toast.show = false" />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import Toast from '@/components/Toast.vue'

const router = useRouter()

const toast = ref({
  show: false,
  type: 'info',
  message: ''
})

const navItems = [
  { path: '/', name: '首页', icon: '🏠' },
  { path: '/compress', name: '压缩', icon: '📦' },
  { path: '/crop', name: '裁剪', icon: '✂️' },
  { path: '/background', name: '换底色', icon: '🎨' },
  { path: '/remove-bg', name: '抠图', icon: '🔮' },
  { path: '/watermark', name: '水印', icon: '📝' },
  { path: '/remove-watermark', name: '去水印', icon: '🧹' }
]

const showToast = (message, type = 'info') => {
  toast.value = {
    show: true,
    type,
    message
  }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

provide('showToast', showToast)
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1.25rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.nav-link:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--primary-color);
}

.nav-link.active {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.nav-icon {
  font-size: 1rem;
}

.main {
  flex: 1;
  padding: 24px 20px 100px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .header {
    padding: 8px 0;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .logo {
    justify-content: center;
  }

  .nav {
    justify-content: flex-start;
    -webkit-overflow-scrolling: touch;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 13px;
  }

  .nav-text {
    display: none;
  }

  .main {
    padding: 16px 16px 120px;
  }
}
</style>
