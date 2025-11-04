import type { Node, Edge } from 'reactflow'

/**
 * Convert ReactFlow nodes and edges to the tools format expected by the database
 * Tools are stored IN ORDER. Connected tools form a chain where each tool's next_tool
 * points to the immediate next tool in the series.
 * 
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns Array of tools with next_tool relationships in order
 */
export function workflowToTools(nodes: Node[], edges: Edge[]): Array<{ tool: string; next_tool: string | null }> {
  // Create a map of node IDs to their tool types
  const nodeIdToType = new Map<string, string>()
  nodes.forEach((node) => {
    if (node.type) {
      nodeIdToType.set(node.id, node.type)
    }
  })

  // Create a map of source node ID to target node ID (for edges)
  const nodeToNextNode = new Map<string, string>()
  edges.forEach((edge) => {
    nodeToNextNode.set(edge.source, edge.target)
  })

  // Find all starting nodes (nodes with no incoming edges)
  const nodesWithIncoming = new Set<string>()
  edges.forEach((edge) => {
    nodesWithIncoming.add(edge.target)
  })

  const startingNodes = nodes.filter((node) => !nodesWithIncoming.has(node.id))

  // Process each chain starting from nodes with no incoming edges
  const tools: Array<{ tool: string; next_tool: string | null }> = []
  const processedNodeIds = new Set<string>()

  // Helper function to traverse a chain
  const traverseChain = (nodeId: string): void => {
    if (processedNodeIds.has(nodeId)) return

    const nodeType = nodeIdToType.get(nodeId)
    if (!nodeType) return

    processedNodeIds.add(nodeId)

    const nextNodeId = nodeToNextNode.get(nodeId)
    if (nextNodeId) {
      const nextNodeType = nodeIdToType.get(nextNodeId)
      if (nextNodeType) {
        // This tool is connected to the next one
        tools.push({
          tool: nodeType,
          next_tool: nextNodeType,
        })
        // Continue traversing the chain
        traverseChain(nextNodeId)
      } else {
        // Next node exists but has no type
        tools.push({
          tool: nodeType,
          next_tool: null,
        })
      }
    } else {
      // No next node, this is the end of the chain
      tools.push({
        tool: nodeType,
        next_tool: null,
      })
    }
  }

  // Process all chains starting from nodes with no incoming edges
  startingNodes.forEach((node) => {
    traverseChain(node.id)
  })

  // Handle any remaining nodes that weren't processed (isolated nodes without edges)
  nodes.forEach((node) => {
    if (!processedNodeIds.has(node.id) && node.type) {
      tools.push({
        tool: node.type,
        next_tool: null,
      })
    }
  })

  return tools
}

/**
 * Convert tools format from database to ReactFlow nodes and edges
 * @param tools - Array of tools with next_tool relationships
 * @returns Object with nodes and edges arrays
 */
export function toolsToWorkflow(
  tools: Array<{ tool: string; next_tool: string | null }>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Create nodes for each tool
  tools.forEach((toolData, index) => {
    const node: Node = {
      id: `${toolData.tool}-${index + 1}`,
      type: toolData.tool,
      position: { x: 100 + index * 200, y: 100 },
      data: {
        label: toolData.tool,
      },
    }
    nodes.push(node)
  })

  // Create edges based on next_tool relationships
  tools.forEach((toolData, index) => {
    if (toolData.next_tool) {
      // Find the target node
      const targetIndex = tools.findIndex((t) => t.tool === toolData.next_tool)
      if (targetIndex !== -1) {
        const sourceNode = nodes[index]
        const targetNode = nodes[targetIndex]
        edges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: 'custom',
        })
      }
    }
  })

  return { nodes, edges }
}

