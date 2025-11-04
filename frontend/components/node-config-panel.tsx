"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { WorkflowNode } from "@/lib/types"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState({ ...node.data })

  const handleChange = (key: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      [key]: value,
    }))
    updateNodeData(node.id, { [key]: value })
  }

  const handleConfigChange = (value: string) => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(value)
      handleChange("config", parsed)
    } catch {
      // If not valid JSON, store as string
      handleChange("config", value)
    }
  }

  const configValue =
    typeof localData.config === "string"
      ? localData.config
      : JSON.stringify(localData.config || {}, null, 2)

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Configure {node.data.label}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="label">Tool Label</Label>
          <Input id="label" value={localData.label || ""} onChange={(e) => handleChange("label", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this tool does"
          />
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="required"
            checked={localData.required || false}
            onCheckedChange={(checked) => handleChange("required", checked)}
          />
          <Label htmlFor="required">Required Tool</Label>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        <div className="space-y-2">
          <Label htmlFor="config">Configuration (JSON)</Label>
          <Textarea
            id="config"
            value={configValue}
            onChange={(e) => handleConfigChange(e.target.value)}
            className="h-64 font-mono text-sm"
            placeholder='{\n  "key": "value"\n}'
          />
          <p className="text-xs text-gray-500">Enter tool-specific configuration as JSON</p>
        </div>
      </div>
    </div>
  )
}
