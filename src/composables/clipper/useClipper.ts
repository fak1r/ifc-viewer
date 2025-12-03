import * as THREE from 'three'
import * as OBC from '@thatopen/components'

export type ClipperWorld = {
  components: OBC.Components
  world: any
  container: HTMLElement
}

export type UseClipperOptions = {
  world: ClipperWorld
  orientation?: 'vertical' | 'horizontal'
  fragmentsReady?: Promise<unknown> | null
}

export function useClipper({ world, orientation: initialOrientation = 'vertical', fragmentsReady }: UseClipperOptions) {
  if (!world?.components || !world?.world || !world?.container) {
    throw new Error('[useClipper] Передайте { components, world, container } из useWorld().')
  }

  const components = world.components
  const obcWorld = world.world

  const casters = components.get(OBC.Raycasters)
  casters.get(obcWorld)

  const clipper = components.get(OBC.Clipper)
  clipper.enabled = false

  let enabled = false
  let currentY: number | null = null
  let currentX: number | null = null
  let orientation: 'vertical' | 'horizontal' = initialOrientation
  let detachFragmentsListener: (() => void) | null = null

  const bbox = new THREE.Box3()
  const center = new THREE.Vector3()

  // Отслеживаем где находится плоскость среза
  clipper.list.onItemSet.add(({ value }) => {
    const plane = value as OBC.SimplePlane

    plane.onDraggingEnded.add(() => {
      plane.update()
      const plane3 = plane.three
      if (orientation === 'vertical') {
        currentX = plane3.constant
        currentY = null
      } else {
        currentY = plane3.constant
        currentX = null
      }
    })
  })

  async function createPlaneAt(value: number) {
    if (orientation === 'vertical') {
      clipper.createFromNormalAndCoplanarPoint(obcWorld, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(value, 0, 0))
    } else {
      clipper.createFromNormalAndCoplanarPoint(obcWorld, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, value, 0))
    }
  }

  async function movePlaneTo(value: number) {
    clipper.deleteAll()
    if (orientation === 'vertical') {
      currentX = value
      currentY = null
    } else {
      currentY = value
      currentX = null
    }
    await createPlaneAt(value)
  }

  async function ensurePlane() {
    if (currentX !== null || currentY !== null) return
    await centerOnModel()
  }

  async function enable() {
    clipper.enabled = true
    enabled = true
    await ensurePlane()
    if (orientation === 'horizontal' && currentY !== null) await movePlaneTo(currentY)
    else if (orientation === 'vertical' && currentX !== null) await movePlaneTo(currentX)
  }
  function disable() {
    clipper.enabled = false
    enabled = false
    clipper.deleteAll()
  }
  function clear() {
    clipper.deleteAll()
    currentX = null
    currentY = null
  }
  function toggle() {
    if (enabled) {
      disable()
    } else {
      void enable()
    }
  }

  async function setOrientation(next: 'vertical' | 'horizontal') {
    if (next === orientation) return
    clipper.deleteAll()
    orientation = next
    currentX = null
    currentY = null
    if (enabled) {
      await centerOnModel()
    }
  }

  async function centerOnModel() {
    if (fragmentsReady) {
      try {
        await fragmentsReady
      } catch {
        return
      }
    }

    let fm: OBC.FragmentsManager | null = null
    try {
      fm = components.get(OBC.FragmentsManager)
    } catch {
      return
    }

    if (!fm?.list?.size) return

    bbox.makeEmpty()
    for (const frag of fm.list.values()) bbox.expandByObject(frag.object)
    if (!Number.isFinite(bbox.min.y)) return

    bbox.getCenter(center)
    const value = orientation === 'horizontal' ? center.y : center.x
    if (enabled) {
      await movePlaneTo(value)
    } else {
      if (orientation === 'horizontal') {
        currentY = value
        currentX = null
      } else {
        currentX = value
        currentY = null
      }
      clipper.deleteAll()
    }
  }

  function setupFragmentsListener() {
    if (fragmentsReady) {
      fragmentsReady.then(() => attach()).catch(() => {})
    } else {
      attach()
    }

    function attach() {
      let fm: OBC.FragmentsManager | null = null
      try {
        fm = components.get(OBC.FragmentsManager)
      } catch {
        return
      }
      if (!fm?.list?.onItemSet) return
      const handler = () => void centerOnModel()
      fm.list.onItemSet.add(handler)
      detachFragmentsListener = () => {
        try {
          fm?.list?.onItemSet?.remove?.(handler)
        } catch {}
      }
    }
  }

  setupFragmentsListener()

  return {
    get enabled() {
      return enabled
    },
    get currentY() {
      return currentY
    },
    get currentX() {
      return currentX
    },
    get obcClipper() {
      return clipper
    },
    get orientation() {
      return orientation
    },

    enable,
    disable,
    clear,
    toggle,
    setOrientation,
    setSingleVerticalCutAtX: (x0: number) => void movePlaneTo(x0),
    setSingleHorizontalCutAtY: (y0: number) => void movePlaneTo(y0),
    centerOnModel,
    detachFragmentsListener: () => detachFragmentsListener?.(),
  }
}

export type UseClipper = ReturnType<typeof useClipper>
