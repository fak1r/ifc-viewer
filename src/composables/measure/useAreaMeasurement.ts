import { type Ref } from 'vue'
import * as THREE from 'three'
import * as OBF from '@thatopen/components-front'
import type { Components, World } from '@thatopen/components'
import {
  useMeasurementBase,
  type MeasurementOptions,
  type MeasurementDeps,
} from '@/composables/measure/useMeasurementBase'

export interface AreaMeasurementOptions extends MeasurementOptions {}
interface AreaMeasurementDeps extends MeasurementDeps {
  components: Ref<Components | null>
  world: Ref<World | null>
}

export function useAreaMeasurement(deps: AreaMeasurementDeps) {
  const base = useMeasurementBase(
    {
      components: deps.components,
      world: deps.world,
    },
    {
      createMeasurer: (c) => c.get(OBF.AreaMeasurement),
      onItemAdded: ({ item, world }) => {
        // автокадр по boundingSphere полигона
        const bbox = item?.boundingBox
        if (!bbox) return
        const sphere = new THREE.Sphere()
        bbox.getBoundingSphere(sphere)
        world.camera.controls?.fitToSphere(sphere, true)
      },
    },
  )

  function start() {
    const m: any = base.measurer.value
    // у Area есть пошаговое создание: используем startCreation если есть, иначе create
    m?.startCreation?.() ?? m?.create?.()
  }
  function finishMeasurement() {
    const m: any = base.measurer.value
    m?.endCreation?.()
  }
  function clearMeasurement() {
    base.clear()
  }
  function activateMeasurement(on: boolean) {
    base.setEnabled(on)
  }

  return {
    measurer: base.measurer,
    state: base.state,
    setupMeasurement: (opts?: AreaMeasurementOptions) => base.setup(opts),
    updateMeasurementOptions: base.updateOptions,
    activateMeasurement,
    start,
    finishMeasurement,
    clearMeasurement,
  }
}
