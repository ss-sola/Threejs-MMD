import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import * as THREE from 'three';
const app = createApp(App)

app.use(router)
app.config.globalProperties.$THREE = THREE;
app.mount('#app')
