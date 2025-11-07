import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

export type ClipStylerWorld = {
  components: OBC.Components
  world: any // тип мира из useWorld()
  container: HTMLElement
}

export type UseClipStylerOptions = {
  world: ClipStylerWorld
  lineWidth?: number
}

export function useClipStyler({ world, lineWidth = 2 }: UseClipStylerOptions) {
  if (!world?.components || !world?.world || !world?.container) {
    throw new Error('[useClipStyler] Передайте { components, world, container } из useWorld().')
  }

  const { components } = world

  // Инициализируем ClipStyler и привязываем world (по докам)
  const clipStyler = components.get(OBF.ClipStyler)
  clipStyler.world = world.world // :contentReference[oaicite:0]{index=0}

  // Базовый стиль: только чёрные линии, без заливки (минимум опций)
  clipStyler.styles.set('CutOutline', {
    linesMaterial: new LineMaterial({ color: 'black', linewidth: lineWidth }), // :contentReference[oaicite:1]{index=1}
  })

  // Линкуем плоскости клиппера к ClipStyler при их создании (по докам)
  const clipper = components.get(OBC.Clipper)
  clipper.list.onItemSet.add(({ key }) => {
    clipStyler.createFromClipping(key, {
      items: { All: { style: 'CutOutline' } }, // :contentReference[oaicite:2]{index=2}
    })
  })

  // Минимальный API — доступ к экземпляру (на случай расширений)
  return {
    get instance() {
      return clipStyler
    },
  }
}

export type UseClipStyler = ReturnType<typeof useClipStyler>

