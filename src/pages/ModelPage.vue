<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModelViewer from '@/components/ModelViewer.vue'
import ModelWorkspace from '@/components/ModelWorkspace.vue'
import type { ModelViewerConfig } from '@/types/ifc-viewer'
import LoadProgressBar from '@/components/UI/LoadProgressBar.vue'

const base = import.meta.env.BASE_URL || '/'

const config: ModelViewerConfig = {
  model: `${location.origin}${base}house-model.ifc`,
  showGrid: true,
  background: '#0e0111',
}

const measurePanelsVisibility = reactive({ square: false, linear: false })
const viewerRef = ref<InstanceType<typeof ModelViewer> | null>(null)

type ViewerContext = { components: any; world: any; container: HTMLElement }
const viewerContext = ref<ViewerContext | null>(null)
const onReady = (v: ViewerContext) => {
  viewerContext.value = v
}
</script>

<template>
  <ModelViewer ref="viewerRef" :config="config" :measure-panels-visibility="measurePanelsVisibility" @ready="onReady">
    <LoadProgressBar />
    <ModelWorkspace :viewer-context="viewerContext" :viewer-ref="viewerRef" />
  </ModelViewer>
</template>

