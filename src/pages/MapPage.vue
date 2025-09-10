<script setup lang="ts">
import MapViewer from "@/components/MapViewer.vue";

const modelUrl =
  "https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc";
const wasmVersion = "0.0.71";
</script>

<template>
  <section class="map-page">
    <MapViewer :model-url="modelUrl" :web-ifc-version="wasmVersion" />
  </section>
</template>

<style scoped lang="scss">
.map-page {
  position: relative;
  height: 100vh;
}
</style>
