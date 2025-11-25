<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, toRefs, shallowRef, computed, nextTick } from 'vue'
import * as OBC from '@thatopen/components'
import type { ModelViewerConfig, ModelSource, ToolApi } from '@/types/ifc-viewer'
import { useWorld } from '@/composables/useWorld'
import { useCamera } from '@/composables/useCamera'
import { useGrid } from '@/composables/useGrid'
import { useFragments } from '@/composables/useFragments'
import { useIfcLoader } from '@/composables/useIfcLoader'
import { useBackground } from '@/composables/useBackground'
import { useAreaMeasurement } from '@/composables/measure/useAreaMeasurement'
import { useLengthMeasurement } from '@/composables/measure/useLengthMeasurement'
import { useMeasurementRouter } from '@/composables/measure/useMeasurementRouter'
import { useMeasurementPanels } from '@/composables/measure/useMeasurementPanels'
import { useViewerFPS } from '@/composables/FPS/useViewerFPS'
import { useClipper, type UseClipper } from '@/composables/clipper/useClipper'
import MeasurePanel from '@/components/MeasurePanel.vue'

interface Props {
  config: ModelViewerConfig
  measurePanelsVisibility: {
    square: boolean
    linear: boolean
  }
}

const props = defineProps<Props>()

const { config } = toRefs(props)

const containerRef = ref<HTMLDivElement | null>(null)

const components = shallowRef<OBC.Components | null>(null)
const world = shallowRef<OBC.World | null>(null)
let cam: ReturnType<typeof useCamera>
const clipper = ref<UseClipper | null>(null)

const {
  state: areaState,
  setupMeasurement: areaSetupMeasurement,
  updateMeasurementOptions: updateAreaOptions,
  activateMeasurement: activateArea,
  start: startArea,
  finishMeasurement: finishArea,
  clearMeasurement: clearArea,
} = useAreaMeasurement({ components, world })

const {
  state: lengthState,
  setupMeasurement: lengthSetupMeasurement,
  updateMeasurementOptions: updateLengthOptions,
  activateMeasurement: activateLength,
  start: startLength,
  finishMeasurement: finishLength,
  clearMeasurement: clearLength,
} = useLengthMeasurement({ components, world })

const { setActive } = useMeasurementRouter({
  container: containerRef,
  tools: {
    area: {
      state: areaState,
      start: startArea,
      finishMeasurement: finishArea,
      clearMeasurement: clearArea,
    },
    length: {
      state: lengthState,
      start: startLength,
      finishMeasurement: finishLength,
      clearMeasurement: clearLength,
    },
  },
})

let measurementsInited = false

let disposeWorld: (() => void) | undefined
let disposeGrid: (() => void) | undefined
let disposeStats: (() => void) | undefined
let disposeFragments: (() => void) | undefined
let ifc: ReturnType<typeof useIfcLoader> | undefined

const depsReady = computed(() => !!components.value && !!world.value)

async function loadModel(source: ModelSource) {
  if (!ifc) throw new Error('Viewer is not ready yet')
  await ifc.load(source, {
    name: typeof source === 'string' ? source.split('/').pop() || 'model' : 'model',
    liftBy: config.value.liftBy ?? 0,
    autoFit: config.value.autoFit ?? false,
  })
  await ifc.groundToGrid(config.value.gridOffset ?? 0, config.value.liftBy ?? 0)
  // центрируем по XZ в (0, 0); если нужно по левому краю — меняем режим на "min"
  await ifc.alignHorizontally(0, 0, 'center')
  // камера смотрит ровно на (0,0,0), дистанция по размеру модели
  await cam.lookAtOrigin()
}

function clear() {
  ifc?.clear()
}

function toggleClipper() {
  clipper.value?.toggle()
}

async function handlePanelToggle(visible: boolean, api: ToolApi, depsReady: boolean) {
  if (!depsReady) return // мир ещё не готов — ждём следующего прохода

  if (visible) {
    await nextTick()
    api.setupMeasurement?.() // лениво инициализируем (без дублей)
    api.activateMeasurement(api.state.enabled) // синхронизация с чекбоксом
  } else {
    if (api.state.ready) api.activateMeasurement(false) // мягкое выключение
  }
}

defineExpose({ loadModel, clear, toggleClipper })

// Жизненный цикл: init/destroy (no async setup => no Suspense warnings)
onMounted(async () => {
  if (!containerRef.value) return

  // Создаём базовый мир (сцена, рендерер, камера)
  const created = useWorld(containerRef.value)
  components.value = created.components
  world.value = created.world
  disposeWorld = created.dispose

  // Режущая плоскость
  clipper.value = useClipper({
    world: {
      components: components.value!,
      world: world.value!,
      container: containerRef.value!,
    },
    orientation: 'horizontal',
    initial: 5,
  })
  clipper.value.enable()

  // Инициализируем камеру (если есть lookAt)
  cam = useCamera(components.value!, world.value!)
  if (config.value.lookAt) {
    const { eye, target } = config.value.lookAt
    await cam.setLookAt(eye, target)
  }

  // Цвет фона
  useBackground(world.value!, config.value.background ?? '#0e0e11')

  // Сетка (опционально)
  if (config.value.showGrid) {
    disposeGrid = useGrid(components.value!, world.value!, config.value.gridOffset ?? 0)
  }

  // Менеджер фрагментов: воркер + хуки к сцене
  const frags = useFragments(components.value!, world.value!)
  disposeFragments = frags.dispose

  // IFC Loader (путь/версия web-ifc wasm)
  ifc = useIfcLoader(components.value!, frags, config.value.wasm)
  await ifc.setup()

  // Загрузка модели, если она указана в пропсах
  if (config.value.model) {
    try {
      await loadModel(config.value.model)
    } catch (err) {
      console.error('Failed to autoload model:', err)
    }
  }
})

onBeforeUnmount(() => {
  // Выключить измерители
  try {
    activateArea?.(false)
  } catch {}
  try {
    activateLength?.(false)
  } catch {}

  // Очистить мир
  try {
    ifc?.clear?.()
  } catch {}
  try {
    disposeFragments?.()
  } catch {}
  try {
    disposeStats?.()
  } catch {}
  try {
    disposeGrid?.()
  } catch {}
  try {
    disposeWorld?.()
  } catch {}
})

watch(
  () => config.value.background,
  (bg) => {
    if (bg && world.value) useBackground(world.value, bg)
  },
)

watch(
  () => [config.value.gridOffset, config.value.liftBy] as const,
  ([gridOffset, liftBy]) => ifc?.groundToGrid(gridOffset ?? 0, liftBy ?? 0),
)

// Включаем измерения при появлении панели
watch(
  () => props.measurePanelsVisibility?.square,
  (v) => {
    if (v) setActive('area')
  },
  { immediate: true },
)

watch(
  () => props.measurePanelsVisibility?.linear,
  (v) => {
    if (v) setActive('length')
  },
  { immediate: true },
)

watch(
  [() => components.value, () => world.value],
  async ([c, w]) => {
    if (!measurementsInited && c && w) {
      await nextTick()
      areaSetupMeasurement?.()
      lengthSetupMeasurement?.()
      measurementsInited = true
    }
  },
  { immediate: true },
)

// Управляет жизненным циклом измерителей (setup/вкл/выкл, depsReady).
useMeasurementPanels({
  panelsVisibility: computed(() => props.measurePanelsVisibility),
  depsReady,
  area: {
    setupMeasurement: areaSetupMeasurement,
    activateMeasurement: activateArea,
    state: areaState,
  },
  length: {
    setupMeasurement: lengthSetupMeasurement,
    activateMeasurement: activateLength,
    state: lengthState,
  },
  handlePanelToggle,
})

useViewerFPS(containerRef)
</script>

<template>
  <div ref="containerRef" class="viewer">
    <MeasurePanel
      v-if="measurePanelsVisibility.square"
      :state="areaState"
      variant="area"
      :top="48"
      @toggle:enabled="(v: boolean) => activateArea(v)"
      @toggle:visible="(v: boolean) => updateAreaOptions({ visible: v })"
      @change:color="(v: string) => updateAreaOptions({ color: v })"
      @change:mode="(v: string) => updateAreaOptions({ mode: v })"
      @change:units="(v: string) => updateAreaOptions({ units: v })"
      @change:rounding="(v: number) => updateAreaOptions({ rounding: v })"
      @action:start="startArea"
      @action:finishMeasurement="finishArea"
      @action:clearMeasurement="clearArea"
    />
    <MeasurePanel
      v-if="measurePanelsVisibility.linear"
      :state="lengthState"
      variant="length"
      :top="218"
      @toggle:enabled="(v: boolean) => activateLength(v)"
      @toggle:visible="(v: boolean) => updateLengthOptions({ visible: v })"
      @change:color="(v: string) => updateLengthOptions({ color: v })"
      @change:mode="(v: string) => updateLengthOptions({ mode: v })"
      @change:units="(v: string) => updateLengthOptions({ units: v })"
      @change:rounding="(v: number) => updateLengthOptions({ rounding: v })"
      @action:finishMeasurement="finishLength"
      @action:clearMeasurement="clearLength"
    />
    <slot />
  </div>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
}
</style>
