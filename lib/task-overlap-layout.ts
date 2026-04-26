/**
 * Google-Calendar-style overlap layout for time-based events on a single day.
 *
 *   1. Sort events by start (ascending), then by length (descending) so that
 *      the longest of a tie picks the leftmost lane.
 *   2. Form clusters: a cluster is a maximal run of events whose intervals
 *      all transitively overlap. A new cluster starts when an event begins
 *      at or after the running max-end of the current cluster.
 *   3. Inside a cluster, place each event into the lowest-indexed lane whose
 *      previous event has already ended (`prevEnd <= event.start`). The
 *      cluster's column count is the highest lane index used + 1.
 *   4. Expansion: once lanes are assigned, each event tries to extend its
 *      width across lanes to its right. It increments `colSpan` while none
 *      of the events in those further lanes overlap its `[start, end)`
 *      interval; stops at the first conflict.
 *
 * Returns a `Map<eventId, { lane, columns, colSpan }>` for the caller to
 * convert into pixel/percent geometry.
 */

export interface OverlapInputEvent {
  id: string
  /** Inclusive start (minutes since midnight). */
  startMin: number
  /** Exclusive end (minutes since midnight). `endMin > startMin`. */
  endMin: number
}

export interface OverlapSlot {
  /** 0-indexed lane within the cluster. */
  lane: number
  /** Total lanes used by the cluster the event belongs to. */
  columns: number
  /** How many lanes this event spans (>=1, <= columns - lane). */
  colSpan: number
}

interface ClusterEntry {
  ev: OverlapInputEvent
  lane: number
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function computeOverlapLayout(events: OverlapInputEvent[]): Map<string, OverlapSlot> {
  const result = new Map<string, OverlapSlot>()
  if (events.length === 0) return result

  const sorted = [...events].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return b.endMin - b.startMin - (a.endMin - a.startMin)
  })

  // We accumulate one cluster at a time, then flush it (assign columns +
  // expansion + write into result) when a new event starts after the
  // running max-end.
  let clusterMaxEnd = -Infinity
  let cluster: ClusterEntry[] = []
  // lane -> last endMin in this cluster
  let laneEnds: number[] = []

  const flushCluster = () => {
    if (cluster.length === 0) return
    const columns = laneEnds.length

    for (const entry of cluster) {
      const { ev, lane } = entry
      let colSpan = 1
      for (let next = lane + 1; next < columns; next++) {
        const conflict = cluster.some(
          (other) =>
            other !== entry &&
            other.lane === next &&
            intervalsOverlap(ev.startMin, ev.endMin, other.ev.startMin, other.ev.endMin),
        )
        if (conflict) break
        colSpan++
      }
      result.set(ev.id, { lane, columns, colSpan })
    }
    cluster = []
    laneEnds = []
    clusterMaxEnd = -Infinity
  }

  for (const ev of sorted) {
    if (ev.startMin >= clusterMaxEnd) flushCluster()

    let lane = laneEnds.findIndex((end) => end <= ev.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(ev.endMin)
    } else {
      laneEnds[lane] = ev.endMin
    }

    cluster.push({ ev, lane })
    if (ev.endMin > clusterMaxEnd) clusterMaxEnd = ev.endMin
  }

  flushCluster()
  return result
}
