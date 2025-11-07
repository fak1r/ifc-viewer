import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

export type ClipperWorld = {
  // Контракты That Open: обязательны для интерактива (стрелка/гизмо)
  components: OBC.Components
  world: any // ваш тип мира из useWorld (совместим с OBC.World)
  container: HTMLElement
}

export type UseClipperOptions = {
  world: ClipperWorld
  /**
   * Ориентация плоскости:
   * - 'vertical'  → нормаль (1,0,0), сдвиг по X
   * - 'horizontal'→ нормаль (0,1,0), сдвиг по Y
   */
  orientation?: 'vertical' | 'horizontal'
  /**
   * Начальное смещение (x для vertical, y для horizontal).
   * По умолчанию 0.
   */
  initial?: number
  /**
   * Включить стиллинг сечений (ClipStyler).
   */
  styledCuts?: boolean
  /**
   * Параметры гизмо/хелперов (стрелки).
   */
  helpers?: {
    visible?: boolean
    opacity?: number
    size?: number
  }
}

export function useClipper({
  world,
  orientation = 'vertical',
  initial = 0,
  styledCuts = true,
  helpers,
}: UseClipperOptions) {
  // --- Валидация зависимостей ---
  if (!world?.components || !world?.world || !world?.container) {
    throw new Error(
      '[useClipper] Требуются That Open components/world/container. ' +
        'Передайте { components, world, container } из useWorld().',
    )
  }

  const components = world.components
  const obcWorld = world.world
  const container = world.container

  // --- Raycasters: обязательны для перетаскивания гизмо ("стрелки") ---
  const casters = components.get(OBC.Raycasters)
  casters.get(obcWorld)

  // --- Clipper: интерактивная плоскость и гизмо ---
  const clipper = components.get(OBC.Clipper)
  clipper.enabled = false // включим через enable()

  // Настройки гизмо (стрелки)
  if (helpers) {
    if (typeof helpers.visible === 'boolean') clipper.config.visible = helpers.visible
    if (typeof helpers.opacity === 'number') clipper.config.opacity = helpers.opacity
    if (typeof helpers.size === 'number') clipper.config.size = helpers.size
  } else {
    clipper.config.visible = true
    clipper.config.opacity = 0.2
    clipper.config.size = 5
  }

  // --- ClipStyler: линии/заливки сечений, автообновление после drag ---
  const clipStyler = components.get(OBF.ClipStyler)
  clipStyler.world = obcWorld

  if (styledCuts) {
    clipStyler.styles.set('BlackFill', {
      fillsMaterial: new THREE.MeshBasicMaterial({ color: 'black', side: 2 }),
    })
  }

  // --- Служебное состояние (совместимость с исходным API) ---
  let enabled = false
  let currentY: number | null = null
  let currentX: number | null = null

  // Ключ текущей плоскости в clipper.list
  let planeKey: string | null = null

  // Помощник: дождаться следующего добавления в список, получить key
  const nextPlaneKey = () =>
    new Promise<string>((resolve) => {
      const off = clipper.list.onItemSet.add(({ key }: { key: string }) => {
        off() // отписаться сразу после первого срабатывания
        resolve(key)
      })
    })

  // Создать плоскость согласно ориентации и координате
  const createPlaneAt = async (value: number) => {
    // Нормаль и точка на плоскости
    let normal: THREE.Vector3
    let point: THREE.Vector3
    if (orientation === 'vertical') {
      normal = new THREE.Vector3(1, 0, 0)
      point = new THREE.Vector3(value, 0, 0)
    } else {
      normal = new THREE.Vector3(0, -1, 0)
      point = new THREE.Vector3(0, value, 0)
    }

    const keyPromise = nextPlaneKey()
    clipper.createFromNormalAndCoplanarPoint(obcWorld, normal, point)
    const key = await keyPromise
    planeKey = key

    if (styledCuts) {
      // Привяжем стили к новой плоскости (один общий стиль — можно расширить при необходимости)
      clipStyler.createFromClipping(key, {
        items: {
          All: { style: 'BlackFill' },
        },
      })
    }
  }

  // Переставить существующую плоскость (реализация через recreate: deleteAll + create)
  const movePlaneTo = async (value: number) => {
    clipper.deleteAll()
    planeKey = null
    if (orientation === 'vertical') {
      currentX = value
      currentY = null
    } else {
      currentY = value
      currentX = null
    }
    await createPlaneAt(value)
  }

  // --- Инициализация: создаём одну плоскость сразу (как требует дока) ---
  // Делаем синхронный запуск “в фоне” без ожидания — чтобы не блокировать импорт.
  // Если нужно строго дождаться, можно await-ить этот промис снаружи.
  createPlaneAt(initial).then(() => {
    if (orientation === 'vertical') currentX = initial
    else currentY = initial
  })

  // --- Методы под ваш API (совместимость) ---
  const addVerticalPlaneAtX = (x0: number) => {
    // В твоём ТЗ плоскость одна. Поэтому “добавление” = перестановка вертикальной.
    if (orientation !== 'vertical') {
      // Если нужен принудительный вертикальный режим — можно перестроить:
      // но чтобы не менять контракт, просто переставим при текущей ориентации.
    }
    movePlaneTo(x0)
  }

  const addHorizontalPlaneAtY = (y0: number) => {
    if (orientation !== 'horizontal') {
      // Аналогично комментарию выше.
    }
    movePlaneTo(y0)
  }

  const setSingleVerticalCutAtX = (x0: number) => {
    movePlaneTo(x0)
  }

  const setSingleHorizontalCutAtY = (y0: number) => {
    movePlaneTo(y0)
  }

  // --- Управление состоянием ---
  const enable = () => {
    clipper.enabled = true
    enabled = true
  }

  const disable = () => {
    clipper.enabled = false
    enabled = false
    // Плоскость в доке “всегда существует”, поэтому не чистим deleteAll() здесь.
    // Если нужно скрыть на время — можно clipper.config.visible = false (вынести в API).
  }

  const clear = () => {
    // В твоём сценарии чистка не нужна. Оставим как no-op для совместимости.
    // Если всё же потребуется сбросить, раскомментируй:
    // clipper.deleteAll(); planeKey = null; currentX = null; currentY = null;
  }

  return {
    // Геттеры — как в твоём исходнике
    get enabled() {
      return enabled
    },
    // Список плоскостей управляет clipper.list (у нас одна плоскость),
    // для совместимости вернём пустой readonly массив (в Three-пути это были THREE.Plane[])
    get planes() {
      return [] as readonly THREE.Plane[]
    },
    get currentY() {
      return currentY
    },
    get currentX() {
      return currentX
    },

    enable,
    disable,
    clear,

    addVerticalPlaneAtX,
    addHorizontalPlaneAtY,
    setSingleVerticalCutAtX,
    setSingleHorizontalCutAtY,
  }
}

export type UseClipper = ReturnType<typeof useClipper>

