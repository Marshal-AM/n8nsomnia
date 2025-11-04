"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
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
import { Save, ArrowLeft } from "lucide-react"
import NodeLibrary from "./node-library"
import NodeConfigPanel from "./node-config-panel"
import CustomEdge from "./custom-edge"
import { ToolNode } from "./nodes/tool-node"
import { generateNodeId, createNode } from "@/lib/workflow-utils"
import type { WorkflowNode } from "@/lib/types"
import { AIChatModal } from "./ai-chat-modal"
import { useAuth } from "@/lib/auth"
import { createAgent, getAgentById, updateAgent } from "@/lib/agents"
import { workflowToTools } from "@/lib/workflow-converter"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const toolTypes = [
  "transfer",
  "swap",
  "get_balance",
  "deploy_erc20",
  "deploy_erc721",
  "create_dao",
  "airdrop",
  "fetch_price",
  "deposit_yield",
  "wallet_analytics",
]

const nodeTypes: NodeTypes = {
  transfer: ToolNode,
  swap: ToolNode,
  get_balance: ToolNode,
  deploy_erc20: ToolNode,
  deploy_erc721: ToolNode,
  create_dao: ToolNode,
  airdrop: ToolNode,
  fetch_price: ToolNode,
  deposit_yield: ToolNode,
  wallet_analytics: ToolNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

interface WorkflowBuilderProps {
  agentId?: string
}

export default function WorkflowBuilder({ agentId }: WorkflowBuilderProps) {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [loadingAgent, setLoadingAgent] = useState(false)
  const [saving, setSaving] = useState(false)

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
      if (typeof type === "undefined" || !type || !toolTypes.includes(type)) {
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
    [reactFlowInstance, setNodes, toolTypes],
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

  const handleSaveClick = () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Add some tools to your workflow first",
        variant: "destructive",
      })
      return
    }

    if (!authenticated || !user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to save your workflow",
        variant: "destructive",
      })
      return
    }

    // Show the save dialog
    setShowSaveDialog(true)
  }

  const saveWorkflow = async () => {
    if (!agentName.trim()) {
      toast({
        title: "Agent name required",
        description: "Please enter a name for your agent",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const tools = workflowToTools(nodes, edges)

      if (agentId) {
        // Update existing agent
        await updateAgent(agentId, {
          name: agentName,
          description: agentDescription || null,
          tools,
        })
        toast({
          title: "Agent updated",
          description: "Your agent has been updated successfully",
        })
        setShowSaveDialog(false)
      } else {
        // Create new agent
        if (!user?.id) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          })
          return
        }
        const agent = await createAgent(user.id, agentName, agentDescription || null, tools)
        toast({
          title: "Agent created",
          description: "Your agent has been created successfully",
        })
        setShowSaveDialog(false)
        // Redirect to my-agents or stay on builder with the agent ID
        router.push(`/agent-builder?agent=${agent.id}`)
      }
    } catch (error: any) {
      console.error("Error saving agent:", error)
      toast({
        title: "Error saving agent",
        description: error.message || "Failed to save agent",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  // Load agent if agentId is provided
  useEffect(() => {
    if (agentId && authenticated && user?.id) {
      loadAgent()
    }
  }, [agentId, authenticated, user])

  const loadAgent = async () => {
    if (!agentId) return
    setLoadingAgent(true)
    try {
      const agent = await getAgentById(agentId)
      if (agent) {
        // Verify ownership
        if (agent.user_id !== user?.id) {
          toast({
            title: "Access denied",
            description: "You don't have permission to access this agent",
            variant: "destructive",
          })
          router.push("/my-agents")
          return
        }

        setAgentName(agent.name)
        setAgentDescription(agent.description || "")
        // TODO: Convert tools back to workflow format using toolsToWorkflow
        // For now, we'll keep the current workflow and just show the agent info
      }
    } catch (error) {
      console.error("Error loading agent:", error)
      toast({
        title: "Error loading agent",
        description: "Failed to load agent data",
        variant: "destructive",
      })
    } finally {
      setLoadingAgent(false)
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
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
                <Button onClick={handleSaveClick} size="sm" variant="outline" disabled={loadingAgent}>
                  <Save className="h-4 w-4 mr-2" />
                  {agentId ? "Update Agent" : "Save Agent"}
                </Button>
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

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{agentId ? "Update Agent" : "Create Agent"}</DialogTitle>
            <DialogDescription>
              Enter the name and description for your agent. The workflow will be saved with all configured tools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name *</Label>
              <Input
                id="agent-name"
                placeholder="My Agent"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description (optional)</Label>
              <Textarea
                id="agent-description"
                placeholder="Describe what this agent does..."
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveWorkflow} disabled={saving || !agentName.trim()}>
              {saving ? "Saving..." : agentId ? "Update Agent" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
