import { watch, type Ref } from 'vue'

export type ToolApi = {
  setupMeasurement?: (opts?: Record<string, any>) => void
  activateMeasurement: (on: boolean) => void
  state: { enabled: boolean; ready?: boolean }
}

type Args = {
  panelsVisibility: Ref<{ square: boolean; linear: boolean }>
  depsReady: Ref<boolean> | (() => boolean)
  area: ToolApi
  length: ToolApi
  handlePanelToggle: (visible: boolean, api: ToolApi, depsReady: boolean) => void
}

export function useMeasurementPanels({ panelsVisibility, depsReady, area, length, handlePanelToggle }: Args) {
  const ready = () => (typeof depsReady === 'function' ? depsReady() : !!depsReady.value)

  // Area / square
  watch(
    () => panelsVisibility.value.square,
    (visible) => handlePanelToggle(visible, area, ready()),
    { immediate: true },
  )

  // Length / linear
  watch(
    () => panelsVisibility.value.linear,
    (visible) => handlePanelToggle(visible, length, ready()),
    { immediate: true },
  )

  // Если панель включили до готовности deps — синхронизируемся при появлении deps
  watch(
    () => ready(),
    (isReady) => {
      if (!isReady) return
      const v = panelsVisibility.value
      if (v.square) handlePanelToggle(true, area, true)
      if (v.linear) handlePanelToggle(true, length, true)
    },
    { immediate: true },
  )
}
