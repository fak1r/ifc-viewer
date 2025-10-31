import * as THREE from 'three'
import * as OBC from '@thatopen/components'

export function useBackground(world: OBC.World, color: string) {
  const scene = world.scene.three as THREE.Scene

  try {
    const c = new THREE.Color(color)
    scene.background = c
  } catch {
    scene.background = null
  }
}
