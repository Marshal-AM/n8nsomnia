"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Bot, MessageCircle, Calendar, Plus } from "lucide-react"

// Mock data for agents
const mockAgents = [
  {
    id: "1",
    name: "Customer Support Bot",
    description: "Handles customer inquiries and support tickets automatically",
    lastModified: "2024-01-15",
    messageCount: 42,
  },
  {
    id: "2",
    name: "Data Processing Agent",
    description: "Processes and transforms data between different formats",
    lastModified: "2024-01-14",
    messageCount: 28,
  },
  {
    id: "3",
    name: "Email Automation",
    description: "Sends automated emails based on workflow triggers",
    lastModified: "2024-01-13",
    messageCount: 15,
  },
  {
    id: "4",
    name: "Content Generator",
    description: "Generates content based on user inputs and templates",
    lastModified: "2024-01-12",
    messageCount: 67,
  },
  {
    id: "5",
    name: "Analytics Dashboard",
    description: "Collects and analyzes data from multiple sources",
    lastModified: "2024-01-11",
    messageCount: 33,
  },
  {
    id: "6",
    name: "Task Scheduler",
    description: "Manages and schedules recurring tasks and reminders",
    lastModified: "2024-01-10",
    messageCount: 19,
  },
]

export default function MyAgents() {
  const handleAgentClick = (agentId: string) => {
    // Placeholder for chat functionality
    console.log(`Opening chat with agent: ${agentId}`)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Agents</h1>
            <p className="text-muted-foreground mt-2">
              Manage and interact with your Somnia agents
            </p>
          </div>
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg font-semibold">
            <Link href="/agent-builder">
              <Plus className="h-5 w-5 mr-2" />
              Create a New Somnia Agent
            </Link>
          </Button>
        </div>

        {/* Agents Grid */}
        {mockAgents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockAgents.map((agent) => (
              <Card
                key={agent.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => handleAgentClick(agent.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span>{agent.messageCount} messages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(agent.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAgentClick(agent.id)
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Agent
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first Somnia agent to get started with workflow automation
            </p>
            <Button asChild size="lg">
              <Link href="/agent-builder">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Agent
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

