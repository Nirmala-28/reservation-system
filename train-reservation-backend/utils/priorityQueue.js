// utils/priorityQueue.js

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Helper methods to get parent and child indices
  getParentIndex(index) {
    return Math.floor((index - 1) / 2);
  }

  getLeftChildIndex(index) {
    return 2 * index + 1;
  }

  getRightChildIndex(index) {
    return 2 * index + 2;
  }

  swap(index1, index2) {
    const temp = this.heap[index1];
    this.heap[index1] = this.heap[index2];
    this.heap[index2] = temp;
  }

  // Insert a new element
  enqueue(item, priority, timestamp = Date.now()) {
    const node = { item, priority, timestamp };
    this.heap.push(node);
    this.heapifyUp();
  }

  // Remove and return the highest priority element
  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop().item;

    const root = this.heap[0].item;
    this.heap[0] = this.heap.pop();
    this.heapifyDown();
    return root;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0].item : null;
  }

  size() {
    return this.heap.length;
  }

  // Bubble up to maintain heap property
  heapifyUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIdx = this.getParentIndex(index);
      if (this.compare(index, parentIdx) > 0) {
        this.swap(index, parentIdx);
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  // Bubble down to maintain heap property
  heapifyDown() {
    let index = 0;
    const length = this.heap.length;

    while (this.getLeftChildIndex(index) < length) {
      let largerChildIdx = this.getLeftChildIndex(index);
      const rightChildIdx = this.getRightChildIndex(index);

      if (
        rightChildIdx < length &&
        this.compare(rightChildIdx, largerChildIdx) > 0
      ) {
        largerChildIdx = rightChildIdx;
      }

      if (this.compare(largerChildIdx, index) > 0) {
        this.swap(index, largerChildIdx);
        index = largerChildIdx;
      } else {
        break;
      }
    }
  }

  // Custom comparison: higher priority value wins.
  // If priorities match, earlier timestamp wins (FIFO).
  compare(index1, index2) {
    const node1 = this.heap[index1];
    const node2 = this.heap[index2];

    if (node1.priority !== node2.priority) {
      return node1.priority - node2.priority; // Positive means node1 has higher priority
    }
    return node2.timestamp - node1.timestamp; // Positive means node1 has earlier timestamp (FIFO)
  }

  // Get raw array representation for visualization
  getRawData() {
    return this.heap.map(node => ({
      item: node.item,
      priority: node.priority,
      timestamp: node.timestamp
    }));
  }
}

module.exports = PriorityQueue;
