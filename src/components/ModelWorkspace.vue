<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as OBC from '@thatopen/components'
import type { World } from '@thatopen/components'

import MeasurePanel from '@/components/UI/MeasurePanel.vue'
import SvgIcons from '@/components/Svg/SvgIcons.vue'
import UploadModelButton from '@/components/UI/UploadModelButton.vue'
import ClipperPanel from '@/components/UI/ClipperPanel.vue'
import { useAreaMeasurement } from '@/composables/measure/useAreaMeasurement'
import { useLengthMeasurement } from '@/composables/measure/useLengthMeasurement'
import { useMeasurementRouter } from '@/composables/measure/useMeasurementRouter'
import type ModelViewer from '@/components/ModelViewer.vue'

export interface viewerContext {
  components: OBC.Components
  world: World
  container: HTMLElement
}

type ViewerInstance = InstanceType<typeof ModelViewer>

const props = defineProps<{
  viewerContext: viewerContext | null
  viewerRef: ViewerInstance | null
}>()

// ===== Видимость панелей
const panels = ref({ square: false, linear: false })
const clipperPanelVisible = ref(false)
const clipperEnabled = ref(false)
const clipperOrientation = ref<'horizontal' | 'vertical'>('horizontal')

// ===== Доступ к deps через computed
const componentsRef = computed(() => props.viewerContext?.components ?? null)
const worldRef = computed(() => props.viewerContext?.world ?? null)
const containerRef = computed<HTMLElement | null>(() => props.viewerContext?.container ?? null)
const depsReady = computed(() => !!componentsRef.value && !!worldRef.value && !!containerRef.value)

// ===== Измерители
const area = useAreaMeasurement({ components: componentsRef, world: worldRef })
const length = useLengthMeasurement({ components: componentsRef, world: worldRef })

// ===== Router: вяжем жесты/клавиши к контейнеру вьювера
const router = useMeasurementRouter({
  container: containerRef,
  tools: {
    area: {
      state: area.state,
      start: area.start,
      finishMeasurement: area.finishMeasurement,
      clearMeasurement: area.clearMeasurement,
    },
    length: {
      state: length.state,
      start: length.start ?? (() => {}),
      finishMeasurement: length.finishMeasurement,
      clearMeasurement: length.clearMeasurement,
    },
  },
})

// ===== Безопасные обёртки (не трогаем тул до готовности deps)
function ensureAreaReady() {
  if (!depsReady.value) return false
  if (!area.state.ready) area.setupMeasurement?.()
  return true
}
function ensureLengthReady() {
  if (!depsReady.value) return false
  if (!length.state.ready) length.setupMeasurement?.()
  return true
}

function activateAreaSafe(v: boolean) {
  if (!ensureAreaReady()) return
  area.activateMeasurement(v)
}
function updateAreaOptionsSafe(opts: any) {
  if (!ensureAreaReady()) return
  area.updateMeasurementOptions(opts)
}
function activateLengthSafe(v: boolean) {
  if (!ensureLengthReady()) return
  length.activateMeasurement(v)
}
function updateLengthOptionsSafe(opts: any) {
  if (!ensureLengthReady()) return
  length.updateMeasurementOptions(opts)
}
function togglePannel(name: 'linear' | 'square') {
  panels.value[name] = !panels.value[name]
}

async function handleFile(file: File) {
  const viewer = props.viewerRef
  if (!viewer) return
  viewer.clear()
  await viewer.loadModel(file).catch(console.error)
}

function toggleClipperPanel() {
  clipperPanelVisible.value = !clipperPanelVisible.value
}

function setClipperEnabled(value: boolean) {
  const viewer = props.viewerRef
  if (!viewer) return
  if (value === clipperEnabled.value) return
  try {
    viewer.toggleClipper?.()
    clipperEnabled.value = value
  } catch (err) {
    console.error(err)
  }
}

watch(
  () => props.viewerRef,
  (viewer) => {
    clipperEnabled.value = viewer?.isClipperEnabled?.() ?? clipperEnabled.value
    clipperOrientation.value = viewer?.getClipperOrientation?.() ?? clipperOrientation.value
  },
  { immediate: true },
)

async function setClipperOrientation(value: 'horizontal' | 'vertical') {
  const viewer = props.viewerRef
  if (!viewer) return
  if (value === clipperOrientation.value) return
  try {
    await viewer.setClipperOrientation?.(value)
    clipperOrientation.value = value
  } catch (err) {
    console.error(err)
  }
}

// Реакция на открытие/закрытие панелей: активируем тул и роутер
watch(
  () => panels.value.square,
  (visible) => {
    if (!depsReady.value) return
    if (visible) {
      ensureAreaReady()
      area.activateMeasurement(true)
      router.setActive('area')
    } else {
      area.activateMeasurement(false)
      if (router.active.value === 'area') router.setActive(null)
    }
  },
)

watch(
  () => panels.value.linear,
  (visible) => {
    if (!depsReady.value) return
    if (visible) {
      ensureLengthReady()
      length.activateMeasurement(true)
      router.setActive('length')
    } else {
      length.activateMeasurement(false)
      if (router.active.value === 'length') router.setActive(null)
    }
  },
)

watch(
  () => clipperPanelVisible.value,
  (visible) => {
    if (!visible) return
    clipperEnabled.value = props.viewerRef?.isClipperEnabled?.() ?? clipperEnabled.value
    clipperOrientation.value = props.viewerRef?.getClipperOrientation?.() ?? clipperOrientation.value
  },
)
</script>

<template>
  <div class="workspace-overlay">
    <div class="toolbar">
      <UploadModelButton @file-selected="handleFile" />

      <div class="toolbar__icons">
        <button class="toolbar__icon" type="button" @click="toggleClipperPanel">
          <SvgIcons icon="section-view" />
        </button>
        <button class="toolbar__icon" type="button" @click="togglePannel('square')">
          <SvgIcons icon="square-measurement" />
        </button>
        <button class="toolbar__icon" type="button" @click="togglePannel('linear')">
          <SvgIcons icon="linear-measurement" />
        </button>
      </div>
    </div>

    <ClipperPanel
      v-if="clipperPanelVisible"
      :enabled="clipperEnabled"
      :orientation="clipperOrientation"
      :top="60"
      @toggle:enabled="setClipperEnabled"
      @change:orientation="setClipperOrientation"
    />

    <MeasurePanel
      v-if="panels.square && depsReady"
      :state="area.state"
      variant="area"
      :top="130"
      @toggle:enabled="(v: boolean) => activateAreaSafe(v)"
      @toggle:visible="(v: boolean) => updateAreaOptionsSafe({ visible: v })"
      @change:color="(v: string) => updateAreaOptionsSafe({ color: v })"
      @change:mode="(v: string) => updateAreaOptionsSafe({ mode: v })"
      @change:units="(v: string) => updateAreaOptionsSafe({ units: v })"
      @change:rounding="(v: number) => updateAreaOptionsSafe({ rounding: v })"
      @action:start="area.start"
      @action:finishMeasurement="area.finishMeasurement"
      @action:clearMeasurement="area.clearMeasurement"
    />

    <MeasurePanel
      v-if="panels.linear && depsReady"
      :state="length.state"
      variant="length"
      :top="300"
      @toggle:enabled="(v: boolean) => activateLengthSafe(v)"
      @toggle:visible="(v: boolean) => updateLengthOptionsSafe({ visible: v })"
      @change:color="(v: string) => updateLengthOptionsSafe({ color: v })"
      @change:mode="(v: string) => updateLengthOptionsSafe({ mode: v })"
      @change:units="(v: string) => updateLengthOptionsSafe({ units: v })"
      @change:rounding="(v: number) => updateLengthOptionsSafe({ rounding: v })"
      @action:start="length.start"
      @action:finishMeasurement="length.finishMeasurement"
      @action:clearMeasurement="length.clearMeasurement"
    />
  </div>
</template>

<style scoped>
.workspace-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.toolbar {
  position: absolute;
  left: 12px;
  top: 12px;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.toolbar__icons {
  display: flex;
  gap: 8px;
}

.toolbar__icon {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  padding: 6px;
  border-radius: 8px;
  height: 30px;
  width: 30px;
}
.toolbar__icon:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>

