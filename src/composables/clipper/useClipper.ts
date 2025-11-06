import * as THREE from 'three'

export type ClipperWorld = {
  renderer?: {
    three?: THREE.WebGLRenderer
  } | null
}

export type UseClipperOptions = {
  world: ClipperWorld
}

export function useClipper({ world }: UseClipperOptions) {
  const renderer = world?.renderer?.three
  if (!renderer) {
    throw new Error('[useClipper] world.renderer.three не инициализирован')
  }

  const planes: THREE.Plane[] = []
  let enabled = false

  let currentY: number | null = null
  let currentX: number | null = null

  const apply = () => {
    renderer.clippingPlanes = planes
    renderer.localClippingEnabled = enabled
  }

  const enable = () => {
    enabled = true
    apply()
  }

  const disable = () => {
    enabled = false
    planes.length = 0
    apply()
  }

  const clear = () => {
    planes.length = 0
    apply()
  }

  const addVerticalPlaneAtX = (x0: number) => {
    const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0)
    planes.push(plane)
    currentX = x0
    apply()
    return plane
  }

  const addHorizontalPlaneAtY = (y0: number) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), y0)
    planes.push(plane)
    currentY = y0
    apply()
    return plane
  }

  const setSingleVerticalCutAtX = (x0: number) => {
    planes.length = 0
    addVerticalPlaneAtX(x0)
    currentX = x0
  }

  const setSingleHorizontalCutAtY = (y0: number) => {
    planes.length = 0
    addHorizontalPlaneAtY(y0)
    currentY = y0
  }

  return {
    get enabled() {
      return enabled
    },
    get planes() {
      return planes as readonly THREE.Plane[]
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

