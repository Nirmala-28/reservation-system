// utils/segmentTree.js

class SegmentTree {
  // size represents the number of sub-segments (stops - 1)
  constructor(size) {
    this.size = size;
    // tree stores the number of occupied seats in each interval
    // For simplicity, we track seat availability for a single seat first, 
    // where 0 = free, 1 = occupied.
    this.tree = new Array(4 * size).fill(0);
    this.lazy = new Array(4 * size).fill(0);
  }

  // Push lazy updates down to children
  push(node, start, end) {
    if (this.lazy[node] !== 0) {
      this.tree[node] += this.lazy[node];
      if (start !== end) {
        this.lazy[2 * node + 1] += this.lazy[node];
        this.lazy[2 * node + 2] += this.lazy[node];
      }
      this.lazy[node] = 0;
    }
  }

  // Range Update: Mark a segment [l, r] as occupied (+1) or free (-1)
  updateRange(node, start, end, l, r, val) {
    this.push(node, start, end);

    if (start > end || start > r || end < l) {
      return;
    }

    if (start >= l && end <= r) {
      this.tree[node] += val;
      if (start !== end) {
        this.lazy[2 * node + 1] += val;
        this.lazy[2 * node + 2] += val;
      }
      return;
    }

    const mid = Math.floor((start + end) / 2);
    this.updateRange(2 * node + 1, start, mid, l, r, val);
    this.updateRange(2 * node + 2, mid + 1, end, l, r, val);

    this.tree[node] = Math.max(this.tree[2 * node + 1], this.tree[2 * node + 2]);
  }

  // Range Query: Check if there's any occupancy in [l, r]. Returns max value (0 means completely free).
  queryRange(node, start, end, l, r) {
    if (start > end || start > r || end < l) {
      return 0;
    }

    this.push(node, start, end);

    if (start >= l && end <= r) {
      return this.tree[node];
    }

    const mid = Math.floor((start + end) / 2);
    const p1 = this.queryRange(2 * node + 1, start, mid, l, r);
    const p2 = this.queryRange(2 * node + 2, mid + 1, end, l, r);

    return Math.max(p1, p2);
  }

  // Convenient helper methods for users
  bookSegment(startStopIdx, endStopIdx) {
    // Booking stop 1 to 3 means intervals [1, 2]
    this.updateRange(0, 0, this.size - 1, startStopIdx, endStopIdx - 1, 1);
  }

  releaseSegment(startStopIdx, endStopIdx) {
    this.updateRange(0, 0, this.size - 1, startStopIdx, endStopIdx - 1, -1);
  }

  isSegmentFree(startStopIdx, endStopIdx) {
    // If maximum value in range is 0, then no part of this segment is booked
    const maxOccupancy = this.queryRange(0, 0, this.size - 1, startStopIdx, endStopIdx - 1);
    return maxOccupancy === 0;
  }

  // A fare class has many seats. A segment can accept a booking when its peak
  // occupancy plus the requested passengers stays within that class capacity.
  isSegmentAvailable(startStopIdx, endStopIdx, capacity, quantity = 1) {
    const maxOccupancy = this.queryRange(0, 0, this.size - 1, startStopIdx, endStopIdx - 1);
    return maxOccupancy + quantity <= capacity;
  }
}

module.exports = SegmentTree;
