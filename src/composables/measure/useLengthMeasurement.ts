import { type Ref } from 'vue'
import * as THREE from 'three'
import * as OBF from '@thatopen/components-front'
import type { Components, World } from '@thatopen/components'
import {
  useMeasurementBase,
  type MeasurementOptions,
  type MeasurementDeps,
} from '@/composables/measure/useMeasurementBase'

interface LengthMeasurementDeps extends MeasurementDeps {
  components: Ref<Components | null>
  world: Ref<World | null>
}

export function useLengthMeasurement(deps: LengthMeasurementDeps) {
  const base = useMeasurementBase<OBF.LengthMeasurement>(deps, {
    // создаём измеритель через контейнер компонентов
    createMeasurer: (c) => c.get(OBF.LengthMeasurement),

    // подтягиваем/устанавливаем цвет из материала линий, если есть
    getColor: (m: any) => {
      if (m?.linesMaterial?.color) return m.linesMaterial.color as THREE.Color
      if (m?.color) return m.color as THREE.Color
      return null
    },
    setColor: (m: any, color: THREE.Color) => {
      if (m?.linesMaterial?.color) (m.linesMaterial.color as THREE.Color).set(color)
      else if (m?.color) (m.color as THREE.Color).set(color)
    },

    // автокадр по добавленному отрезку
    onItemAdded: ({ item, world }) => {
      try {
        // item.distance() — длина; возьмём центр и радиус пропорционально длине
        const center = new THREE.Vector3()
        item.getCenter(center)
        const radius = Math.max(1e-3, item.distance() / 3)
        const sphere = new THREE.Sphere(center, radius)
        world.camera.controls?.fitToSphere(sphere, true)
      } catch {
        /* no-op */
      }
    },
  })

  // Базовые действия инструмента
  function start() {
    const m: any = base.measurer.value
    // поддерживаем оба варианта API (по аналогии с AreaMeasurement)
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
    // базовое
    measurer: base.measurer,
    state: base.state,

    // настройка
    setupMeasurement: (opts?: MeasurementOptions) => base.setup(opts),
    updateMeasurementOptions: base.updateOptions,

    // операции
    activateMeasurement,
    start,
    finishMeasurement,
    clearMeasurement,
  }
}
