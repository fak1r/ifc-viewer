import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'

async function init(): Promise<void> {
  const app = createApp(App)

  app.use(router)

  router.isReady().then(() => {
    app.mount('#app')
  })
}

init().catch((e) => {
  console.error(e)
})
