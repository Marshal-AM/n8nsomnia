"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  ArrowRightLeft,
  RefreshCw,
  Wallet,
  Coins,
  Image as ImageIcon,
  Users,
  Gift,
  TrendingUp,
  PiggyBank,
  BarChart3,
} from "lucide-react"

const toolTypes = [
  {
    type: "transfer",
    label: "Transfer",
    description: "Transfer tokens or assets",
    icon: <ArrowRightLeft className="h-4 w-4 mr-2" />,
  },
  {
    type: "swap",
    label: "Swap",
    description: "Swap tokens",
    icon: <RefreshCw className="h-4 w-4 mr-2" />,
  },
  {
    type: "get_balance",
    label: "Get Balance",
    description: "Get wallet balance",
    icon: <Wallet className="h-4 w-4 mr-2" />,
  },
  {
    type: "deploy_erc20",
    label: "Deploy ERC-20",
    description: "Deploy ERC-20 token",
    icon: <Coins className="h-4 w-4 mr-2" />,
  },
  {
    type: "deploy_erc721",
    label: "Deploy ERC-721",
    description: "Deploy ERC-721 NFT",
    icon: <ImageIcon className="h-4 w-4 mr-2" />,
  },
  {
    type: "create_dao",
    label: "Create DAO",
    description: "Create a new DAO",
    icon: <Users className="h-4 w-4 mr-2" />,
  },
  {
    type: "airdrop",
    label: "Airdrop",
    description: "Airdrop tokens to addresses",
    icon: <Gift className="h-4 w-4 mr-2" />,
  },
  {
    type: "fetch_price",
    label: "Fetch Price",
    description: "Fetch token price",
    icon: <TrendingUp className="h-4 w-4 mr-2" />,
  },
  {
    type: "deposit_yield",
    label: "Deposit Yield",
    description: "Deposit to yield farming",
    icon: <PiggyBank className="h-4 w-4 mr-2" />,
  },
  {
    type: "wallet_analytics",
    label: "Wallet Analytics",
    description: "Analyze wallet data",
    icon: <BarChart3 className="h-4 w-4 mr-2" />,
  },
]

export default function NodeLibrary() {
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>, toolType: string) => {
    event.dataTransfer.setData("application/reactflow", toolType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold mb-2">Tools</h2>
      {toolTypes.map((tool) => (
        <Button
          key={tool.type}
          variant="outline"
          className="h-16 justify-start text-left"
          draggable={true}
          onDragStart={(e) => onDragStart(e, tool.type)}
        >
          {tool.icon}
          <div className="flex flex-col items-start">
            <span>{tool.label}</span>
            <span className="text-xs text-gray-500">{tool.description}</span>
          </div>
        </Button>
      ))}
      <div className="mt-4 text-xs text-gray-500">Drag and drop tools onto the canvas to build your workflow</div>
    </div>
  )
}
