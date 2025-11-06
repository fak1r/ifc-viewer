import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import * as OBF from '@thatopen/components-front'

// Внешние типы проекта могут отличаться; держим типы мягкими и независимыми
export type WorldLike = any // ожидается ваш world из useWorld (сцену/камеру и т.д.)
export type ComponentsLike = any // ваш components-менеджер из useWorld

export type UseClipStylerOptions = {
  world: WorldLike
  components: ComponentsLike
}

export type StyleDef = {
  linesMaterial?: LineMaterial
  fillsMaterial?: THREE.Material
}

export function useClipStyler({ world, components }: UseClipStylerOptions) {
  // 1) получить инстанс компонента и привязать world (как в документации)
  const clipStyler = components.get(OBF.ClipStyler)
  clipStyler.world = world

  // 2) задать набор стилей разом
  const setStyles = (defs: Record<string, StyleDef>) => {
    for (const [name, def] of Object.entries(defs)) {
      clipStyler.styles.set(name, def)
    }
  }

  // 3) положить минимальный стиль "BlackFill" (из доки)
  const setMinimalBlackFill = () => {
    setStyles({
      BlackFill: {
        fillsMaterial: new THREE.MeshBasicMaterial({
          color: 'black',
          side: 2, // DoubleSide, как в примере
        }),
      },
    })
  }

  // 4) (на будущее) связка со штатным клиппером:
  // позволяет применить стиль к плоскости клиппера по ключу
  // Пример использования в дальнейшем:
  // clipStylerApi.applyToClipperKey(key, { items: { All: { style: "BlackFill" } } });
  const applyToClipperKey = (
    key: string,
    config: {
      items: Record<
        string,
        {
          style: string
          // опциональные фильтры/данные, когда появится classifier
          data?: Record<string, unknown>
        }
      >
    },
  ) => {
    clipStyler.createFromClipping(key, config)
  }

  return {
    clipStyler, // нативный инстанс на случай расширений
    setStyles,
    setMinimalBlackFill, // быстрый старт (только крышка)
    applyToClipperKey, // прокси для пути с OBC.Clipper (этап 2)
  }
}

export type UseClipStyler = ReturnType<typeof useClipStyler>
