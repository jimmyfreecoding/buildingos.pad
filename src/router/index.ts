import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import InitPage from '@/pages/InitPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'root',
    redirect: () => {
      const initDataStr = localStorage.getItem('initData')
      if (!initDataStr) {
        return { name: 'init' }
      }

      try {
        const initData = JSON.parse(initDataStr)
        const padType = initData.padType || 'wallPad'
        return { path: `/${padType}` }
      } catch {
        return { name: 'init' }
      }
    },
  },
  {
    path: '/init',
    name: 'init',
    component: InitPage,
  },
  {
    path: '/:padType',
    name: 'pad',
    component: () => import('@/pages/TemplateLoader.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
]

const router = createRouter({
  history: createWebHistory('/pad/'),
  routes,
})

router.beforeEach((to, _from, next) => {
  if (to.name === 'init') {
    next()
    return
  }

  const initDataStr = localStorage.getItem('initData')
  if (!initDataStr) {
    next({ name: 'init' })
  } else {
    next()
  }
})

export default router
