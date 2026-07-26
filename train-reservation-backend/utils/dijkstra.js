// utils/dijkstra.js

class DijkstraSolver {
  constructor() {
    this.adjacencyList = {};
  }

  addNode(station) {
    if (!this.adjacencyList[station]) {
      this.adjacencyList[station] = [];
    }
  }

  addEdge(source, destination, durationMinutes) {
    this.addNode(source);
    this.addNode(destination);
    // Directed graph representation (trains travel source -> destination)
    this.adjacencyList[source].push({ node: destination, weight: durationMinutes });
  }

  findShortestPath(startNode, endNode) {
    const distances = {};
    const backtrace = {};
    const visited = new Set();
    const nodes = Object.keys(this.adjacencyList);

    // Initial configuration
    for (let node of nodes) {
      distances[node] = Infinity;
    }
    distances[startNode] = 0;

    while (visited.size < nodes.length) {
      // Find unvisited node with minimum distance
      let currentNode = null;
      let minDistance = Infinity;

      for (let node of nodes) {
        if (!visited.has(node) && distances[node] < minDistance) {
          currentNode = node;
          minDistance = distances[node];
        }
      }

      // If we cannot reach any new nodes, or reached destination, break
      if (currentNode === null || currentNode === endNode) {
        break;
      }

      visited.add(currentNode);

      // Evaluate neighbors
      for (let neighbor of this.adjacencyList[currentNode]) {
        if (visited.has(neighbor.node)) continue;

        const newDistance = distances[currentNode] + neighbor.weight;
        if (newDistance < distances[neighbor.node]) {
          distances[neighbor.node] = newDistance;
          backtrace[neighbor.node] = currentNode;
        }
      }
    }

    // Build shortest path array
    if (distances[endNode] === Infinity) {
      return { path: [], duration: null };
    }

    const path = [endNode];
    let lastStep = endNode;
    while (lastStep !== startNode) {
      path.unshift(backtrace[lastStep]);
      lastStep = backtrace[lastStep];
    }

    return {
      path,
      duration: distances[endNode] // in minutes
    };
  }
}

module.exports = DijkstraSolver;
