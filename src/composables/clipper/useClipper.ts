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
  initial?: number
}

export function useClipper({ world, orientation = 'vertical', initial = 0 }: UseClipperOptions) {
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

  void createPlaneAt(initial).then(() => {
    if (orientation === 'vertical') currentX = initial
    else currentY = initial
  })

  function setSingleVerticalCutAtX(x0: number) {
    void movePlaneTo(x0)
  }
  function setSingleHorizontalCutAtY(y0: number) {
    void movePlaneTo(y0)
  }

  function enable() {
    clipper.enabled = true
    enabled = true

    movePlaneTo(initial)
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
      enable()
    }
  }

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

    enable,
    disable,
    clear,
    toggle,
    setSingleVerticalCutAtX,
    setSingleHorizontalCutAtY,
  }
}

export type UseClipper = ReturnType<typeof useClipper>

