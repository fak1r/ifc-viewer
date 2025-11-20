import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

export type ClipStylerWorld = {
  components: OBC.Components
  world: OBC.World
  container: HTMLElement
}

export type UseClipStylerOptions = {
  world: ClipStylerWorld
}

export function useClipStyler({ world }: UseClipStylerOptions) {
  const { components, world: obcWorld } = world

  const clipStyler = components.get(OBF.ClipStyler)
  clipStyler.world = obcWorld as any

  clipStyler.styles.set('Black', {
    linesMaterial: new LineMaterial({
      color: 'black',
      linewidth: 2,
    }),
    fillsMaterial: new THREE.MeshBasicMaterial({
      color: 'black',
      side: 2,
    }),
  })

  const clipper = components.get(OBC.Clipper)
  clipper.enabled = true

  const createForPlane = (key: string) => {
    const edges = clipStyler.createFromClipping(key, {
      items: {
        All: { style: 'Black' },
      },
    })

    console.log('[useClipStyler] created edges for plane', key, edges)

    if (edges) {
      edges.three.frustumCulled = false
      for (const child of edges.three.children) {
        child.frustumCulled = false
      }
    }
  }

  for (const [key] of clipper.list as any as Map<string, unknown>) {
    console.log('[useClipStyler] initial plane in list:', key)
    createForPlane(key)
  }

  ;(clipper.list as any).onItemSet?.add?.(({ key }: { key: string }) => {
    console.log('[useClipStyler] onItemSet plane:', key)
    createForPlane(key)
  })

  return {
    instance: clipStyler,
  }
}

