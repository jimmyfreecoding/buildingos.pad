import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ControlPage from '@/pages/Control.vue'
import InitPage from '@/pages/InitPage.vue'
import SpacePage from '@/pages/Space.vue'
import MeetingControl from '@/pages/MeetingControl.vue'
import RoomControl from '@/pages/RoomControl.vue'
import TolitePad from '@/pages/TolitePad.vue'
import DoorPad from '@/pages/DoorPad.vue'

// 定义路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'root',
    redirect: to => {
      // Check localStorage
      const initDataStr = localStorage.getItem('initData')
      if (!initDataStr) {
        return { name: 'init' }
      }
      
      try {
        const initData = JSON.parse(initDataStr)
        const type = initData.padType
        
        // Mapping logic
        switch (type) {
          case 'wallPad':
            return { name: 'wallPad' }
          case 'meetingControl':
            return { name: 'meetingControl' }
          case 'roomControl':
            return { name: 'roomControl' }
          case 'tolitePad':
            return { name: 'tolitePad' }
          case 'doorPad':
            return { name: 'doorPad' }
          default:
            return { name: 'wallPad' }
        }
      } catch (e) {
        return { name: 'init' }
      }
    }
  },
  {
    path: '/init',
    name: 'init',
    component: InitPage,
  },
  {
    path: '/wall-pad',
    name: 'wallPad',
    component: HomePage, // Reused HomePage as WallPad
  },
  {
    path: '/meeting-control',
    name: 'meetingControl',
    component: MeetingControl,
  },
  {
    path: '/room-control',
    name: 'roomControl',
    component: RoomControl,
  },
  {
    path: '/tolite-pad',
    name: 'tolitePad',
    component: TolitePad,
  },
  {
    path: '/door-pad',
    name: 'doorPad',
    component: DoorPad,
  },
  {
    path: '/control',
    name: 'control',
    component: ControlPage,
  },
  {
    path: '/space',
    name: 'space',
    component: SpacePage,
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const initDataStr = localStorage.getItem('initData')
  
  if (to.name === 'init') {
    if (initDataStr) {
      // If already initialized, redirect to root to trigger mapping logic
      // But we need to be careful not to infinite loop if root redirects back to init (handled by root redirect logic)
      // Actually, if user manually goes to /init but data exists, maybe we allow them to re-init?
      // Let's allow access to /init even if initialized, to allow re-configuration.
      next()
    } else {
      next()
    }
  } else {
    // For any other page, check if initialized
    if (!initDataStr) {
      next({ name: 'init' })
    } else {
      next()
    }
  }
})

export default router
