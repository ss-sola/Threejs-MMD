import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      component: () => import('@/components/Youla.vue'),
    },
    {
      path:'/move',
      component: () => import('@/components/MMDMove.vue'),
    },
    {
      path:'/test',
      component: () => import('@/components/Test.vue'),
    }
    
  ]
})

export default router
