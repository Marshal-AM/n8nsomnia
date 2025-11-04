"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Wallet, Plus, Download, Copy, Check, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { createWallet, getAddressFromPrivateKey, isValidPrivateKey, saveWalletToUser, getTokenBalances, removeWalletFromUser } from "@/lib/wallet"
import { toast } from "@/components/ui/use-toast"
import { useEffect } from "react"

export function AgentWallet() {
  const { user, dbUser, syncUser, loading } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [privateKeyInput, setPrivateKeyInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<{ stt: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (dbUser?.wallet_address && !newPrivateKey) {
      // Only fetch balances if not showing private key (avoid re-render closing dialog)
      fetchBalances()
    }
  }, [dbUser?.wallet_address, newPrivateKey])

  const fetchBalances = async () => {
    if (!dbUser?.wallet_address) return
    try {
      const balances = await getTokenBalances(dbUser.wallet_address)
      setTokenBalances(balances)
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  const handleCreateWallet = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const wallet = createWallet()
      await saveWalletToUser(user.id, wallet.address, wallet.privateKey)
      setIsCreating(false)
      setNewPrivateKey(wallet.privateKey)
      // Don't call syncUser immediately - it causes re-render that closes dialog
      // syncUser will be called when user closes the dialog or component remounts
    } catch (error: any) {
      toast({
        title: "Error creating wallet",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      })
      setIsCreating(false)
    }
  }

  const handleImportWallet = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    if (!privateKeyInput.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a private key",
        variant: "destructive",
      })
      return
    }

    // Clean the private key (remove 0x if present, add it back)
    const cleanKey = privateKeyInput.trim().startsWith('0x') 
      ? privateKeyInput.trim() 
      : `0x${privateKeyInput.trim()}`

    if (!isValidPrivateKey(cleanKey)) {
      toast({
        title: "Invalid private key",
        description: "Please enter a valid private key",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const address = getAddressFromPrivateKey(cleanKey)
      await saveWalletToUser(user.id, address, cleanKey)
      await syncUser()
      toast({
        title: "Wallet imported",
        description: "Your wallet has been imported successfully",
      })
      setShowImportDialog(false)
      setPrivateKeyInput("")
    } catch (error: any) {
      toast({
        title: "Error importing wallet",
        description: error.message || "Failed to import wallet",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const copyAddress = () => {
    if (dbUser?.wallet_address) {
      navigator.clipboard.writeText(dbUser.wallet_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  const handleRemoveWallet = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setIsRemoving(true)
    try {
      await removeWalletFromUser(user.id)
      await syncUser()
      setTokenBalances(null)
      toast({
        title: "Wallet removed",
        description: "Your wallet has been removed successfully",
      })
      setShowDeleteDialog(false)
    } catch (error: any) {
      toast({
        title: "Error removing wallet",
        description: error.message || "Failed to remove wallet",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Your agent wallet
          </CardTitle>
          {tokenBalances && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">STT Balance</div>
              <div className="text-3xl font-bold">
                {tokenBalances.stt}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-6">
        {dbUser?.wallet_address && !newPrivateKey ? (
          <div className="flex items-center justify-center -mt-4 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">
                {dbUser.wallet_address}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={copyAddress}
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              title="Remove wallet"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              No wallet configured
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Create Wallet
              </Button>
              <Dialog 
                open={showCreateDialog || !!newPrivateKey} 
                onOpenChange={(open) => {
                  // NEVER close if private key is displayed - user must click Close button
                  if (!open && newPrivateKey) {
                    return
                  }
                  // Only allow closing if no private key is displayed
                  if (open) {
                    setShowCreateDialog(true)
                  } else {
                    setShowCreateDialog(false)
                    setNewPrivateKey(null)
                  }
                }}
              >
                <DialogContent
                  onEscapeKeyDown={(e) => {
                    if (newPrivateKey) {
                      e.preventDefault()
                    }
                  }}
                  onPointerDownOutside={(e) => {
                    if (newPrivateKey) {
                      e.preventDefault()
                    }
                  }}
                  onInteractOutside={(e) => {
                    if (newPrivateKey) {
                      e.preventDefault()
                    }
                  }}
                >
                  {newPrivateKey ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Wallet Created Successfully</DialogTitle>
                        <DialogDescription>
                          Save your private key securely - you won't be able to see it again.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4">
                        <Label>Private Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={newPrivateKey}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(newPrivateKey)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            }}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={async () => {
                          setNewPrivateKey(null)
                          setShowCreateDialog(false)
                          // Sync user after closing dialog
                          await syncUser()
                        }}>
                          Close
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Create Agent Wallet</DialogTitle>
                        <DialogDescription>
                          A new wallet will be generated for your agent. Make sure to securely store your private key.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateWallet} disabled={isCreating}>
                          {isCreating ? "Creating..." : "Create Wallet"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Import Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Wallet</DialogTitle>
                    <DialogDescription>
                      Enter your private key to import an existing wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="privateKey">Private Key</Label>
                      <Input
                        id="privateKey"
                        type="password"
                        placeholder="0x..."
                        value={privateKeyInput}
                        onChange={(e) => setPrivateKeyInput(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your private key will be encrypted and stored securely.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImportDialog(false)
                        setPrivateKeyInput("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImportWallet} disabled={isImporting}>
                      {isImporting ? "Importing..." : "Import Wallet"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your agent wallet? This will delete your wallet address and private key from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveWallet}
              disabled={isRemoving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove Wallet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

