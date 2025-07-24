"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Wallet, RefreshCw } from 'lucide-react'

interface ConnectWalletProps {
  account: string | null
  setAccount: (account: string | null) => void
}

interface Account {
  address: string
  balance: string
}

export default function ConnectWallet({ account, setAccount }: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window !== "undefined") {
      if (!window.ethereum) {
        toast({
          title: "MetaMask not detected",
          description: "Please install MetaMask to use this application",
          variant: "destructive",
        })
        return
      } else {
        // Check if already connected
        checkConnection()
      }
    }
  }, [toast])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setSelectedAccount(accounts[0])
          toast({
            title: "Account changed",
            description: `Switched to: ${shortenAddress(accounts[0])}`,
          })
        } else {
          setAccount(null)
          setSelectedAccount("")
          setAvailableAccounts([])
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        }
      }
    }
  }, [setAccount, toast])

  const checkConnection = async () => {
    if (!window.ethereum) return

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      if (accounts.length > 0) {
        setAccount(accounts[0])
        setSelectedAccount(accounts[0])
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    }
  }

  const fetchAllAccounts = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask not detected",
        description: "Please install MetaMask to use this application",
        variant: "destructive",
      })
      return
    }

    try {
      setIsConnecting(true)

      // Check if MetaMask is locked
      const accounts = await window.ethereum.request({
        method: "eth_accounts"
      })

      if (accounts.length === 0) {
        // No accounts connected, request permission
        console.log("No accounts found, requesting access...")
        const requestedAccounts = await window.ethereum.request({
          method: "eth_requestAccounts"
        })

        if (requestedAccounts.length === 0) {
          toast({
            title: "No accounts available",
            description: "Please unlock MetaMask and try again",
            variant: "destructive",
          })
          return
        }
      }

      // Get all available accounts
      const allAccounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      })

      console.log("Found accounts:", allAccounts)

      // Get balance for each account
      const accountsWithBalance: Account[] = []

      for (const address of allAccounts) {
        try {
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          })

          // Convert from wei to ETH
          const balanceInEth = (Number.parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4)

          accountsWithBalance.push({
            address,
            balance: balanceInEth,
          })

          console.log(`Account ${address}: ${balanceInEth} ETH`)
        } catch (balanceError) {
          console.error(`Error getting balance for ${address}:`, balanceError)
          accountsWithBalance.push({
            address,
            balance: "0.0000",
          })
        }
      }

      if (accountsWithBalance.length === 0) {
        toast({
          title: "No accounts found",
          description: "Please make sure MetaMask is unlocked and has accounts",
          variant: "destructive",
        })
        return
      }

      setAvailableAccounts(accountsWithBalance)
      setShowAccountSelector(true)

      if (allAccounts.length > 0 && !account) {
        setSelectedAccount(allAccounts[0])
        setAccount(allAccounts[0])
        toast({
          title: "Wallet connected",
          description: `Connected to: ${shortenAddress(allAccounts[0])}`,
        })
      }

    } catch (error: any) {
      console.error("Error fetching accounts:", error)

      // Handle specific error types
      if (error?.code === 4001) {
        toast({
          title: "Connection rejected",
          description: "You rejected the connection request",
          variant: "destructive",
        })
      } else if (error?.code === -32002) {
        toast({
          title: "Request pending",
          description: "Please check MetaMask for a pending connection request",
          variant: "destructive",
        })
      } else if (error?.message?.includes("User rejected")) {
        toast({
          title: "Connection rejected",
          description: "Please approve the connection in MetaMask",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Connection failed",
          description: "Failed to connect to MetaMask. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const switchAccount = async (newAccount: string) => {
    try {
      // Request MetaMask to switch to the selected account
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      })

      setSelectedAccount(newAccount)
      setAccount(newAccount)

      toast({
        title: "Account switched",
        description: `Now using: ${shortenAddress(newAccount)}`,
      })
    } catch (error) {
      console.error("Error switching account:", error)
      toast({
        title: "Switch failed",
        description: "Failed to switch account. Please manually switch in MetaMask.",
        variant: "destructive",
      })
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setSelectedAccount("")
    setAvailableAccounts([])
    setShowAccountSelector(false)
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const refreshAccounts = async () => {
    await fetchAllAccounts()
    toast({
      title: "Accounts refreshed",
      description: "Account list has been updated",
    })
  }

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="w-full max-w-md">
      {account ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connected Wallet
            </CardTitle>
            <CardDescription>Manage your wallet connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <div className="text-sm font-medium">{shortenAddress(account)}</div>
              <div className="text-xs text-muted-foreground">
                Balance: {availableAccounts.find((acc) => acc.address === account)?.balance || "Loading..."} ETH
              </div>
            </div>

            {showAccountSelector && availableAccounts.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Switch Account:</label>
                <Select value={selectedAccount} onValueChange={switchAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((acc) => (
                      <SelectItem key={acc.address} value={acc.address}>
                        <div className="flex flex-col">
                          <span>{shortenAddress(acc.address)}</span>
                          <span className="text-xs text-muted-foreground">{acc.balance} ETH</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshAccounts} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={disconnectWallet} size="sm">
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={fetchAllAccounts} disabled={isConnecting} className="w-full">
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </>
          )}
        </Button>
      )}
    </div>
  )
}