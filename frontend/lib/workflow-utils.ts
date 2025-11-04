import type { Node, XYPosition } from "reactflow"
import type { NodeData } from "./types"

let toolIdCounter = 0

export const generateNodeId = (type: string): string => {
  toolIdCounter++
  return `${type}-${toolIdCounter}`
}

export const createNode = ({
  type,
  position,
  id,
}: {
  type: string
  position: XYPosition
  id: string
}): Node<NodeData> => {
  return {
    id,
    type,
    position,
    data: {
      label: getDefaultLabel(type),
      description: getDefaultDescription(type),
      config: {},
    },
  }
}

const getDefaultLabel = (type: string): string => {
  const labels: Record<string, string> = {
    transfer: "Transfer",
    swap: "Swap",
    get_balance: "Get Balance",
    deploy_erc20: "Deploy ERC-20",
    deploy_erc721: "Deploy ERC-721",
    create_dao: "Create DAO",
    airdrop: "Airdrop",
    fetch_price: "Fetch Price",
    deposit_yield: "Deposit Yield",
    wallet_analytics: "Wallet Analytics",
  }
  return labels[type] || "Tool"
}

const getDefaultDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    transfer: "Transfer tokens or assets",
    swap: "Swap tokens",
    get_balance: "Get wallet balance",
    deploy_erc20: "Deploy ERC-20 token",
    deploy_erc721: "Deploy ERC-721 NFT",
    create_dao: "Create a new DAO",
    airdrop: "Airdrop tokens to addresses",
    fetch_price: "Fetch token price",
    deposit_yield: "Deposit to yield farming",
    wallet_analytics: "Analyze wallet data",
  }
  return descriptions[type] || "Workflow tool"
}
