import type { Node } from "reactflow"

export interface NodeData {
  label: string
  description?: string
  required?: boolean
  config?: Record<string, any> | string
}

export type WorkflowNode = Node<NodeData>

export interface Workflow {
  nodes: WorkflowNode[]
  edges: any[]
}
