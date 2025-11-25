import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

export function useWorld(container: HTMLElement) {
  const components = new OBC.Components()
  const worlds = components.get(OBC.Worlds)
  const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>()

  world.scene = new OBC.SimpleScene(components)
  world.scene.setup()
  world.scene.three.background = null

  world.renderer = new OBF.PostproductionRenderer(components, container)
  world.camera = new OBC.OrthoPerspectiveCamera(components)

  // world.renderer.postproduction.enabled = true
  // world.renderer.postproduction.style = OBF.PostproductionAspect.COLOR_PEN
  // world.renderer.postproduction.style = OBF.PostproductionAspect.COLOR

  components.init()

  const dispose = () => {
    try {
      components.dispose()
    } catch {}
  }

  return { components, world, dispose } as const
}
