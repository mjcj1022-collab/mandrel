import { describe, it, expect, beforeEach } from 'vitest'
import { useDesignEdit } from '../state/designEdit'

const s = () => useDesignEdit.getState()
const reset = () => useDesignEdit.setState({ active: false, tool: 'edit', vertices: null, original: null, selectedVertex: null, past: [], future: [] })

const ORIG = [0, 0, 0, 1, 1, 1, 2, 0, 0]
const MOVED = [0, 0, 0, 1, 2, 1, 2, 0, 0]

describe('design-tab vertex edit store', () => {
  beforeEach(reset)

  it('begins from a fresh bake and records the original', () => {
    s().begin(ORIG, 'select')
    expect(s().active).toBe(true)
    expect(s().tool).toBe('select')
    expect(s().vertices).toEqual(ORIG)
    expect(s().original).toEqual(ORIG)
  })

  it('commits push one history step and undo/redo walk it', () => {
    s().begin(ORIG, 'edit')
    s().commit(MOVED)
    expect(s().vertices).toEqual(MOVED)
    expect(s().past).toHaveLength(1)

    s().undo()
    expect(s().vertices).toEqual(ORIG)
    expect(s().future).toHaveLength(1)

    s().redo()
    expect(s().vertices).toEqual(MOVED)
  })

  it('reset restores the first bake and clears history', () => {
    s().begin(ORIG, 'edit')
    s().commit(MOVED)
    s().reset()
    expect(s().vertices).toEqual(ORIG)
    expect(s().past).toHaveLength(0)
  })

  it('re-entering while active only switches tool — never discards work', () => {
    s().begin(ORIG, 'edit')
    s().commit(MOVED)
    s().begin([9, 9, 9], 'select')      // simulates re-clicking a tool button
    expect(s().tool).toBe('select')
    expect(s().active).toBe(true)
    expect(s().vertices).toEqual(MOVED)  // edits preserved, not replaced by a re-bake
  })

  it('exit tears the session down', () => {
    s().begin(ORIG, 'edit')
    s().pick(2)
    s().exit()
    expect(s().active).toBe(false)
    expect(s().vertices).toBeNull()
    expect(s().selectedVertex).toBeNull()
  })
})
