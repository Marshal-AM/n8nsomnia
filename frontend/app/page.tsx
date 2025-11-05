"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export default function Home() {
  const { ready, authenticated, login, loading } = useAuth()

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center"
      style={{
        backgroundImage: 'url(/hero-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 80px',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="flex flex-col items-center justify-center gap-8 px-4 text-center w-full">
        <div className="space-y-4 flex flex-col items-center justify-center text-center w-full">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl flex flex-col items-center justify-center">
            <span className="bg-gradient-to-r from-[#AD00FF] to-[#333BFF] text-transparent bg-clip-text">
              Somnia
            </span>
            <span className="block mt-2">
              NO-CODE Agent Builder
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build your own Somnia agents with ease. Create powerful workflows and automate your tasks.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          {authenticated ? (
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/my-agents">
                View My Agents
              </Link>
            </Button>
          ) : (
            <Button onClick={login} size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          )}
        </div>
        {!authenticated && (
          <p className="text-sm text-muted-foreground">
            Connect with email, wallet, or social accounts
          </p>
        )}
      </div>
    </main>
  )
}
