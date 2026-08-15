const SegmentTree = require('./segmentTree');
const PriorityQueue = require('./priorityQueue');
const DijkstraSolver = require('./dijkstra');

describe('reservation algorithms', () => {
  test('Segment Tree permits capacity and rejects an over-capacity route segment', () => {
    const tree = new SegmentTree(3);
    tree.bookSegment(0, 2);

    expect(tree.isSegmentAvailable(0, 1, 2, 1)).toBe(true);
    expect(tree.isSegmentAvailable(0, 1, 2, 2)).toBe(false);
    expect(tree.isSegmentAvailable(2, 3, 2, 2)).toBe(true);
  });

  test('Priority Queue promotes highest priority, then earliest passenger', () => {
    const queue = new PriorityQueue();
    queue.enqueue('later-senior', 3, 200);
    queue.enqueue('first-senior', 3, 100);
    queue.enqueue('regular', 1, 50);

    expect(queue.dequeue()).toBe('first-senior');
    expect(queue.dequeue()).toBe('later-senior');
    expect(queue.dequeue()).toBe('regular');
  });

  test('Dijkstra returns the shortest directed connection', () => {
    const solver = new DijkstraSolver();
    solver.addEdge('A', 'B', 30);
    solver.addEdge('B', 'C', 20);
    solver.addEdge('A', 'C', 80);

    expect(solver.findShortestPath('A', 'C')).toEqual({
      path: ['A', 'B', 'C'],
      duration: 50,
    });
  });
});
