import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '图片工具箱' }
  },
  {
    path: '/compress',
    name: 'Compress',
    component: () => import('@/views/Compress.vue'),
    meta: { title: '图片压缩' }
  },
  {
    path: '/crop',
    name: 'Crop',
    component: () => import('@/views/Crop.vue'),
    meta: { title: '图片裁剪' }
  },
  {
    path: '/background',
    name: 'Background',
    component: () => import('@/views/Background.vue'),
    meta: { title: '换底色' }
  },
  {
    path: '/remove-bg',
    name: 'RemoveBg',
    component: () => import('@/views/RemoveBg.vue'),
    meta: { title: '智能抠图' }
  },
  {
    path: '/watermark',
    name: 'Watermark',
    component: () => import('@/views/Watermark.vue'),
    meta: { title: '加水印' }
  },
  {
    path: '/remove-watermark',
    name: 'RemoveWatermark',
    component: () => import('@/views/RemoveWatermark.vue'),
    meta: { title: '去水印' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach((to) => {
  document.title = to.meta.title || '图片工具箱'
})

export default router
