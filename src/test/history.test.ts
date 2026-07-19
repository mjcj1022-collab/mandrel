import { describe, it, expect, beforeEach } from 'vitest'
import { useModeler } from '../state/modeler'

const s = () => useModeler.getState()

describe('modeler undo / redo', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  it('undoes and redoes object additions', () => {
    s().add('box')
    s().add('sphere')
    expect(s().objects).toHaveLength(2)

    s().undo()
    expect(s().objects).toHaveLength(1)
    expect(s().objects[0].kind).toBe('box')

    s().undo()
    expect(s().objects).toHaveLength(0)

    s().redo()
    expect(s().objects).toHaveLength(1)
    s().redo()
    expect(s().objects).toHaveLength(2)
    expect(s().objects[1].kind).toBe('sphere')
  })

  it('a fresh action after undo clears the redo stack', () => {
    s().add('box')
    s().add('sphere')
    s().undo()
    expect(s().future).toHaveLength(1)
    s().add('cone')
    expect(s().future).toHaveLength(0)
    expect(s().objects.map(o => o.kind)).toEqual(['box', 'cone'])
    s().redo()   // nothing to redo
    expect(s().objects).toHaveLength(2)
  })

  it('undo of a vertex edit restores the prior geometry', () => {
    s().add('box')
    const id = s().selectedId!
    s().bakeToMesh(id)
    const before = s().objects.find(o => o.id === id)!.vertices!.slice()
    // simulate a sculpt commit
    const moved = before.slice(); moved[0] += 5
    s().update(id, { vertices: moved })
    expect(s().objects.find(o => o.id === id)!.vertices![0]).toBeCloseTo(before[0] + 5, 5)
    s().undo()
    expect(s().objects.find(o => o.id === id)!.vertices![0]).toBeCloseTo(before[0], 5)
  })

  it('clears selection when an undo removes the selected object', () => {
    s().add('box')
    expect(s().selectedId).not.toBeNull()
    s().undo()
    expect(s().selectedId).toBeNull()
  })
})
