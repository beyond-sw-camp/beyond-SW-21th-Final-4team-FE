import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import router from './router/index'
import { pinia } from './stores/pinia'
import './assets/styles/index.css'

const app = createApp(App)

const queryClient = new QueryClient()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })
app.use(MotionPlugin) // Register MotionPlugin

app.mount('#app')
