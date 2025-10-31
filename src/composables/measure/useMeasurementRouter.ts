import { ref, watch, onBeforeUnmount, type Ref } from 'vue'

type ToolAPI = {
  state: { enabled: boolean }
  start: () => void
  finishMeasurement: () => void
  clearMeasurement: () => void
  // не у всех есть:
  deleteSelected?: () => void
}

type ToolsMap = {
  area: ToolAPI
  length: ToolAPI
}

export function useMeasurementRouter(args: { container: Ref<HTMLElement | null>; tools: ToolsMap }) {
  const { container, tools } = args
  const active = ref<keyof ToolsMap | null>(null)
  let removeListeners: (() => void) | null = null

  function attach() {
    if (removeListeners || !container.value) return
    const el = container.value as EventTarget

    const onDblClick = () => {
      if (!active.value) return
      const tool = tools[active.value]
      if (!tool.state.enabled) return
      tool.start()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!active.value) return
      const tool = tools[active.value]
      if (!tool.state.enabled) return
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        tool.finishMeasurement()
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (tool.deleteSelected) tool.deleteSelected()
        else tool.clearMeasurement()
      }
    }

    el.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)

    removeListeners = () => {
      el.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }

  function detach() {
    removeListeners?.()
    removeListeners = null
  }

  // Подключаемся как только контейнер появился
  watch(
    () => container.value,
    (el) => {
      if (el) attach()
      else detach()
    },
    { immediate: true },
  )

  /** Делает активным один инструмент и выключает другой */
  function setActive(tool: keyof ToolsMap | null) {
    active.value = tool
    if (tool === 'area') {
      // включаем Area, выключаем Length (уровень инструмента)
      tools.area.state.enabled = true
      tools.length.state.enabled = false
    } else if (tool === 'length') {
      tools.length.state.enabled = true
      tools.area.state.enabled = false
    }
  }

  onBeforeUnmount(detach)

  return {
    active,
    setActive,
  }
}
