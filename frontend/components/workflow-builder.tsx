"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Panel,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from "reactflow"
import "reactflow/dist/style.css"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Save, Upload, Play, ArrowLeft } from "lucide-react"
import NodeLibrary from "./node-library"
import NodeConfigPanel from "./node-config-panel"
import CustomEdge from "./custom-edge"
import { InputNode } from "./nodes/input-node"
import { OutputNode } from "./nodes/output-node"
import { ProcessNode } from "./nodes/process-node"
import { ConditionalNode } from "./nodes/conditional-node"
import { CodeNode } from "./nodes/code-node"
import { generateNodeId, createNode } from "@/lib/workflow-utils"
import type { WorkflowNode } from "@/lib/types"
import { AIChatModal } from "./ai-chat-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const nodeTypes: NodeTypes = {
  input: InputNode,
  output: OutputNode,
  process: ProcessNode,
  conditional: ConditionalNode,
  code: CodeNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

export default function WorkflowBuilder() {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      // Check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return
      }

      if (reactFlowBounds && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

        const newNode = createNode({
          type,
          position,
          id: generateNodeId(type),
        })

        setNodes((nds) => nds.concat(newNode))
      }
    },
    [reactFlowInstance, setNodes],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          }
          return node
        }),
      )
    },
    [setNodes],
  )

  const saveWorkflow = () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    const workflow = {
      nodes,
      edges,
    }

    const workflowString = JSON.stringify(workflow)
    localStorage.setItem("workflow", workflowString)

    toast({
      title: "Workflow saved",
      description: "Your workflow has been saved successfully",
    })
  }

  const loadWorkflow = () => {
    const savedWorkflow = localStorage.getItem("workflow")

    if (!savedWorkflow) {
      toast({
        title: "No saved workflow",
        description: "There is no workflow saved in your browser",
        variant: "destructive",
      })
      return
    }

    try {
      const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedWorkflow)
      setNodes(savedNodes)
      setEdges(savedEdges)
      toast({
        title: "Workflow loaded",
        description: "Your workflow has been loaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error loading workflow",
        description: "There was an error loading your workflow",
        variant: "destructive",
      })
    }
  }

  const executeWorkflow = () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to execute",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Executing workflow",
      description: "Your workflow is being executed (simulation only in this MVP)",
    })

    // In a real implementation, we would traverse the graph and execute each node
    // For the MVP, we'll just simulate execution with a success message
    setTimeout(() => {
      toast({
        title: "Workflow executed",
        description: "Your workflow has been executed successfully",
      })
    }, 2000)
  }

  const handleBackClick = () => {
    const hasUnsavedChanges = nodes.length > 0 || edges.length > 0
    if (hasUnsavedChanges) {
      setShowExitDialog(true)
    } else {
      router.push("/my-agents")
    }
  }

  const handleConfirmExit = () => {
    setShowExitDialog(false)
    router.push("/my-agents")
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Node Library</h2>
        <NodeLibrary />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{ type: "custom" }}
            >
              <Background />
              <Controls />
              <MiniMap />
              <Panel position="top-left">
                <div className="flex gap-2">
                  <Button
                    onClick={handleBackClick}
                    size="default"
                    variant="outline"
                    className="font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setIsAIChatOpen(true)}
                    size="default"
                    variant="default"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg font-semibold"
                  >
                    Create with AI
                  </Button>
                </div>
              </Panel>
              <Panel position="top-right">
                <div className="flex gap-2">
                  <Button onClick={saveWorkflow} size="sm" variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={loadWorkflow} size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                  <Button onClick={executeWorkflow} size="sm" variant="default">
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                </div>
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {selectedNode && (
        <div className="w-80 border-l border-gray-200 p-4 bg-gray-50">
          <NodeConfigPanel
            node={selectedNode as WorkflowNode}
            updateNodeData={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      <AIChatModal open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Agent Builder?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your workflow. If you leave now, all your progress will be lost. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
