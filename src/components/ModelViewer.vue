<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, toRefs, shallowRef } from 'vue'
import * as OBC from '@thatopen/components'
import type { ModelViewerConfig, ModelSource } from '@/types/ifc-viewer'
import { useWorld } from '@/composables/useWorld'
import { useCamera } from '@/composables/useCamera'
import { useGrid } from '@/composables/useGrid'
import { useFragments } from '@/composables/useFragments'
import { useIfcLoader } from '@/composables/useIfcLoader'
import { useBackground } from '@/composables/useBackground'
import { useViewerFPS } from '@/composables/FPS/useViewerFPS'
import { useClipper, type UseClipper } from '@/composables/clipper/useClipper'
import { useClipStyler } from '@/composables/clipper/useClipStyler'

interface Props {
  config: ModelViewerConfig
  measurePanelsVisibility: {
    square: boolean
    linear: boolean
  }
}

const props = defineProps<Props>()

interface Emits {
  (
    e: 'ready',
    v: { components: any; world: any; container: HTMLElement; fragmentsReady: Promise<unknown> | null },
  ): void
}

const emit = defineEmits<Emits>()

const { config } = toRefs(props)

const viewerRef = ref<HTMLDivElement | null>(null)

const components = shallowRef<OBC.Components | null>(null)
const world = shallowRef<OBC.World | null>(null)

let cam: ReturnType<typeof useCamera>
const clipper = ref<UseClipper | null>(null)

let disposeWorld: (() => void) | undefined
let disposeGrid: (() => void) | undefined
let disposeStats: (() => void) | undefined
let disposeFragments: (() => void) | undefined
let disposeClipStyler: (() => void) | null = null
let ifc: ReturnType<typeof useIfcLoader> | undefined
let fragmentsReady: Promise<unknown> | null = null

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
  await clipper.value?.centerOnModel?.()
}

function clear() {
  ifc?.clear()
}

function toggleClipper() {
  clipper.value?.toggle()
}

function isClipperEnabled() {
  return clipper.value?.enabled ?? false
}

async function setClipperOrientation(orientation: 'horizontal' | 'vertical') {
  await clipper.value?.setOrientation?.(orientation)
}

function getClipperOrientation() {
  return clipper.value?.orientation ?? 'horizontal'
}

defineExpose({
  loadModel,
  clear,
  toggleClipper,
  isClipperEnabled,
  setClipperOrientation,
  getClipperOrientation,
  fragmentsReady,
})

onMounted(async () => {
  if (!viewerRef.value) return

  // Создаём базовый мир (сцена, рендерер, камера)
  const created = useWorld(viewerRef.value)
  components.value = created.components
  world.value = created.world
  disposeWorld = created.dispose

  // Менеджер фрагментов: воркер + хуки к сцене
  const frags = useFragments(components.value!, world.value!)
  fragmentsReady = frags.ready
  disposeFragments = frags.dispose

  // Режущая плоскость
  clipper.value = useClipper({
    world: {
      components: components.value!,
      world: world.value!,
      container: viewerRef.value!,
    },
    orientation: 'horizontal',
    fragmentsReady,
  })

  // ClipStyler
  clipper.value.obcClipper.visible = true
  const clipStyler = useClipStyler({
    components: components.value!,
    world: world.value!,
    clipper: clipper.value.obcClipper,
  })
  disposeClipStyler = clipStyler.dispose

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

  // Когда компонент готов передаем данные для панели измерителей
  if (viewerRef.value) {
    emit('ready', { components, world, container: viewerRef.value, fragmentsReady })
  }

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
    disposeClipStyler?.()
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

useViewerFPS(viewerRef)
</script>

<template>
  <div ref="viewerRef" class="viewer">
    <slot />
  </div>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
}
</style>
