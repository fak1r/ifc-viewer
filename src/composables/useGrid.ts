import * as OBC from '@thatopen/components'

export function useGrid(components: OBC.Components, world: OBC.World, offsetY = 0) {
  const grids = components.get(OBC.Grids)
  const grid = grids.create(world)
  grid.three.position.y = offsetY
  return () => {
    try {
      world.scene.three.remove(grid.three)
    } catch {}
  }
}
