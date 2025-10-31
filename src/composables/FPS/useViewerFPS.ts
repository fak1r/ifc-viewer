import { onMounted, onBeforeUnmount, type Ref } from 'vue'
import { useFPS } from './useFPS'

export function useViewerFPS(containerRef: Ref<HTMLElement | null | undefined>) {
  const fps = useFPS(containerRef)

  onMounted(() => {
    fps.attach()
    fps.start()
    fps.setPanel(0)
    fps.setPosition({ top: '8px', right: '8px' })
  })

  onBeforeUnmount(() => {
    fps.stop()
    fps.detach()
    fps.dispose()
  })
}
