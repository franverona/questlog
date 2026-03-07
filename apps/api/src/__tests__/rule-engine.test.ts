import { describe, it, expect } from 'vitest'
import { evalCondition } from '../rule-engine.js'
import type { EventRow } from '../rule-engine.js'
import type { Condition } from '@questlog/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvents(
  eventName: string,
  daysAgo: number[]
): EventRow[] {
  return daysAgo.map((ago) => {
    const d = new Date()
    d.setDate(d.getDate() - ago)
    d.setHours(10, 0, 0, 0)
    return { eventName, createdAt: d }
  })
}

// ─── event_count ──────────────────────────────────────────────────────────────

describe('event_count', () => {
  it('returns true when count meets threshold', () => {
    const events = makeEvents('login', [0, 1, 2])
    const condition: Condition = { type: 'event_count', event_name: 'login', threshold: 3 }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns true when count exceeds threshold', () => {
    const events = makeEvents('login', [0, 1, 2, 3, 4])
    const condition: Condition = { type: 'event_count', event_name: 'login', threshold: 3 }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns false when count is below threshold', () => {
    const events = makeEvents('login', [0, 1])
    const condition: Condition = { type: 'event_count', event_name: 'login', threshold: 3 }
    expect(evalCondition(condition, events)).toBe(false)
  })

  it('returns false when there are zero events', () => {
    const condition: Condition = { type: 'event_count', event_name: 'login', threshold: 1 }
    expect(evalCondition(condition, [])).toBe(false)
  })

  it('ignores events with a different name', () => {
    const events = makeEvents('purchase', [0, 1, 2, 3])
    const condition: Condition = { type: 'event_count', event_name: 'login', threshold: 1 }
    expect(evalCondition(condition, events)).toBe(false)
  })
})

// ─── streak ───────────────────────────────────────────────────────────────────

describe('streak', () => {
  it('returns true for a perfect consecutive streak ending today', () => {
    const events = makeEvents('login', [0, 1, 2, 3, 4, 5, 6])
    const condition: Condition = { type: 'streak', event_name: 'login', days: 7 }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns true when streak exceeds threshold', () => {
    const events = makeEvents('login', [0, 1, 2, 3, 4, 5, 6, 7, 8])
    const condition: Condition = { type: 'streak', event_name: 'login', days: 5 }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns false when streak is broken by a gap day', () => {
    // days 0,1 then gap at 2, then 3,4
    const events = makeEvents('login', [0, 1, 3, 4])
    const condition: Condition = { type: 'streak', event_name: 'login', days: 4 }
    expect(evalCondition(condition, events)).toBe(false)
  })

  it('returns false for zero events', () => {
    const condition: Condition = { type: 'streak', event_name: 'login', days: 1 }
    expect(evalCondition(condition, [])).toBe(false)
  })

  it('returns false when streak is shorter than required days', () => {
    const events = makeEvents('login', [0, 1, 2])
    const condition: Condition = { type: 'streak', event_name: 'login', days: 7 }
    expect(evalCondition(condition, events)).toBe(false)
  })

  it('counts each day only once (duplicate events on same day)', () => {
    // 4 events today, 1 yesterday — still only 2 distinct days
    const events = [
      ...makeEvents('login', [0, 0, 0, 0]),
      ...makeEvents('login', [1]),
    ]
    const condition: Condition = { type: 'streak', event_name: 'login', days: 3 }
    expect(evalCondition(condition, events)).toBe(false)
  })

  it('returns true for a 1-day streak when event happened today', () => {
    const events = makeEvents('login', [0])
    const condition: Condition = { type: 'streak', event_name: 'login', days: 1 }
    expect(evalCondition(condition, events)).toBe(true)
  })
})

// ─── combination AND ──────────────────────────────────────────────────────────

describe('combination AND', () => {
  it('returns true when all conditions are met', () => {
    const events = [
      ...makeEvents('login', [0, 1, 2, 3, 4]),
      ...makeEvents('purchase', [0]),
    ]
    const condition: Condition = {
      type: 'combination',
      operator: 'AND',
      conditions: [
        { type: 'event_count', event_name: 'login', threshold: 5 },
        { type: 'event_count', event_name: 'purchase', threshold: 1 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns false when only one condition is met', () => {
    const events = makeEvents('login', [0, 1, 2, 3, 4])
    const condition: Condition = {
      type: 'combination',
      operator: 'AND',
      conditions: [
        { type: 'event_count', event_name: 'login', threshold: 5 },
        { type: 'event_count', event_name: 'purchase', threshold: 1 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(false)
  })

  it('returns false when no conditions are met', () => {
    const condition: Condition = {
      type: 'combination',
      operator: 'AND',
      conditions: [
        { type: 'event_count', event_name: 'login', threshold: 5 },
        { type: 'event_count', event_name: 'purchase', threshold: 1 },
      ],
    }
    expect(evalCondition(condition, [])).toBe(false)
  })
})

// ─── combination OR ───────────────────────────────────────────────────────────

describe('combination OR', () => {
  it('returns true when only the first condition is met', () => {
    const events = makeEvents('page_view', [0, 1, 2])
    const condition: Condition = {
      type: 'combination',
      operator: 'OR',
      conditions: [
        { type: 'event_count', event_name: 'page_view', threshold: 3 },
        { type: 'event_count', event_name: 'search', threshold: 5 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns true when only the second condition is met', () => {
    const events = makeEvents('search', [0, 1, 2, 3, 4])
    const condition: Condition = {
      type: 'combination',
      operator: 'OR',
      conditions: [
        { type: 'event_count', event_name: 'page_view', threshold: 3 },
        { type: 'event_count', event_name: 'search', threshold: 5 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns false when no conditions are met', () => {
    const condition: Condition = {
      type: 'combination',
      operator: 'OR',
      conditions: [
        { type: 'event_count', event_name: 'page_view', threshold: 3 },
        { type: 'event_count', event_name: 'search', threshold: 5 },
      ],
    }
    expect(evalCondition(condition, [])).toBe(false)
  })
})

// ─── nested combination ───────────────────────────────────────────────────────

describe('nested combination', () => {
  it('evaluates deeply nested AND inside OR', () => {
    const events = [
      ...makeEvents('login', [0, 1, 2, 3, 4]),
      ...makeEvents('purchase', [0]),
    ]
    const condition: Condition = {
      type: 'combination',
      operator: 'OR',
      conditions: [
        {
          type: 'combination',
          operator: 'AND',
          conditions: [
            { type: 'event_count', event_name: 'login', threshold: 5 },
            { type: 'event_count', event_name: 'purchase', threshold: 1 },
          ],
        },
        { type: 'event_count', event_name: 'share', threshold: 1 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(true)
  })

  it('returns false when inner AND fails and OR has no other match', () => {
    const events = makeEvents('login', [0, 1, 2, 3, 4])
    const condition: Condition = {
      type: 'combination',
      operator: 'OR',
      conditions: [
        {
          type: 'combination',
          operator: 'AND',
          conditions: [
            { type: 'event_count', event_name: 'login', threshold: 5 },
            { type: 'event_count', event_name: 'purchase', threshold: 1 },
          ],
        },
        { type: 'event_count', event_name: 'share', threshold: 1 },
      ],
    }
    expect(evalCondition(condition, events)).toBe(false)
  })
})
