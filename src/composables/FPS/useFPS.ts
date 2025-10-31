import { type Ref } from 'vue'
import Stats from 'stats.js'

type FpsPosition = Partial<Record<'top' | 'right' | 'bottom' | 'left', string>>

export function useFPS(containerRef: Ref<HTMLElement | null | undefined>) {
  let stats: Stats | null = null
  let rafId: number | null = null
  let attached = false

  function ensureStats() {
    if (!stats) stats = new Stats()
  }

  function attach() {
    if (attached) return
    ensureStats()
    const el = containerRef.value
    if (el && stats) {
      el.appendChild(stats.dom)
      attached = true
    }
  }

  function detach() {
    if (!attached || !stats) return
    stats.dom.parentElement?.removeChild(stats.dom)
    attached = false
  }

  function start() {
    ensureStats()
    if (rafId != null) return
    const loop = () => {
      stats?.begin()
      stats?.end()
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)
  }

  function stop() {
    if (rafId != null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function setPanel(panel: 0 | 1 | 2) {
    ensureStats()
    stats?.showPanel(panel)
  }

  function setPosition(pos: FpsPosition) {
    ensureStats()
    if (!stats) return
    const style = stats.dom.style
    style.position = 'absolute'
    style.top = ''
    style.right = ''
    style.bottom = ''
    style.left = ''
    if (pos.top) style.top = pos.top
    if (pos.right) style.right = pos.right
    if (pos.bottom) style.bottom = pos.bottom
    if (pos.left) style.left = pos.left
    style.zIndex = '10'
  }

  function dispose() {
    stop()
    detach()
    stats = null
  }

  return { attach, detach, start, stop, setPanel, setPosition, dispose }
}
