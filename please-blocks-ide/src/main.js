import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useDataRegistry } from './stores/dataRegistry.js'
import { useComponentStore } from './stores/componentStore.js'

const app   = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Inisialisasi stores yang butuh processing saat boot
const dataRegistry   = useDataRegistry()
const componentStore = useComponentStore()
dataRegistry.processAndRegister()
componentStore.processAndRegister()

app.mount('#app')
