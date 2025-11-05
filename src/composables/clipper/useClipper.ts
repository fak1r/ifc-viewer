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
    apply()
    return plane
  }

  const addHorizontalPlaneAtY = (y0: number) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), y0)
    planes.push(plane)
    apply()
    return plane
  }

  const setSingleVerticalCutAtX = (x0: number) => {
    planes.length = 0
    addVerticalPlaneAtX(x0)
  }

  const setSingleHorizontalCutAtY = (y0: number) => {
    planes.length = 0
    addHorizontalPlaneAtY(y0)
  }

  return {
    get enabled() {
      return enabled
    },
    get planes() {
      return planes as readonly THREE.Plane[]
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

