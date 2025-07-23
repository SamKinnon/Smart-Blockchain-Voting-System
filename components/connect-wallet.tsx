"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Wallet, RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window !== "undefined") {
      const checkMetaMask = () => {
        if (window.ethereum && window.ethereum.isMetaMask) {
          setIsMetaMaskInstalled(true)
          setConnectionError(null)
          // Check if already connected
          checkConnection()
        } else {
          setIsMetaMaskInstalled(false)
          setConnectionError("MetaMask is not installed. Please install MetaMask extension.")
        }
      }

      // Check immediately
      checkMetaMask()

      // Also check after a short delay in case MetaMask loads later
      const timeout = setTimeout(checkMetaMask, 1000)

      return () => clearTimeout(timeout)
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum && isMetaMaskInstalled) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed:", accounts)
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setSelectedAccount(accounts[0])
          setConnectionError(null)
          toast({
            title: "Account changed",
            description: `Switched to: ${shortenAddress(accounts[0])}`,
          })
        } else {
          setAccount(null)
          setSelectedAccount("")
          setAvailableAccounts([])
          setConnectionError("No accounts connected")
        }
      }

      const handleChainChanged = (chainId: string) => {
        console.log("Chain changed:", chainId)
        // Reload the page when chain changes
        window.location.reload()
      }

      const handleConnect = (connectInfo: { chainId: string }) => {
        console.log("Connected to chain:", connectInfo.chainId)
        setConnectionError(null)
      }

      const handleDisconnect = (error: { code: number; message: string }) => {
        console.log("Disconnected:", error)
        setAccount(null)
        setSelectedAccount("")
        setAvailableAccounts([])
        setConnectionError("Disconnected from MetaMask")
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
      window.ethereum.on("connect", handleConnect)
      window.ethereum.on("disconnect", handleDisconnect)

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
          window.ethereum.removeListener("chainChanged", handleChainChanged)
          window.ethereum.removeListener("connect", handleConnect)
          window.ethereum.removeListener("disconnect", handleDisconnect)
        }
      }
    }
  }, [isMetaMaskInstalled])

  const checkConnection = async () => {
    if (!window.ethereum || !isMetaMaskInstalled) return

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      console.log("Existing accounts:", accounts)
      if (accounts.length > 0) {
        setAccount(accounts[0])
        setSelectedAccount(accounts[0])
        setConnectionError(null)
      }
    } catch (error) {
      console.error("Error checking connection:", error)
      setConnectionError("Failed to check existing connection")
    }
  }

  const connectToMetaMask = async () => {
    if (!window.ethereum || !isMetaMaskInstalled) {
      setConnectionError("MetaMask is not installed")
      return
    }

    try {
      setIsConnecting(true)
      setConnectionError(null)

      console.log("Requesting account access...")

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      console.log("Accounts received:", accounts)

      if (accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask")
      }

      // Get balance for each account
      const accountsWithBalance: Account[] = []

      for (const address of accounts) {
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
        } catch (error) {
          console.error(`Error getting balance for ${address}:`, error)
          accountsWithBalance.push({
            address,
            balance: "0.0000",
          })
        }
      }

      setAvailableAccounts(accountsWithBalance)
      setShowAccountSelector(true)

      // Set the first account as selected
      setSelectedAccount(accounts[0])
      setAccount(accounts[0])

      toast({
        title: "Connected successfully",
        description: `Connected to ${shortenAddress(accounts[0])}`,
      })
    } catch (error: any) {
      console.error("Connection error:", error)

      let errorMessage = "Failed to connect to MetaMask"

      if (error.code === 4001) {
        errorMessage = "Connection rejected by user"
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending. Please check MetaMask."
      } else if (error.message) {
        errorMessage = error.message
      }

      setConnectionError(errorMessage)

      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const switchAccount = async (newAccount: string) => {
    try {
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
        description: "Failed to switch account",
        variant: "destructive",
      })
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setSelectedAccount("")
    setAvailableAccounts([])
    setShowAccountSelector(false)
    setConnectionError(null)
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const refreshAccounts = async () => {
    await connectToMetaMask()
  }

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Show MetaMask installation prompt
  if (!isMetaMaskInstalled) {
    return (
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>MetaMask Required</AlertTitle>
          <AlertDescription className="mt-2">
            Please install MetaMask to use this application.
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://metamask.io/download/", "_blank")}
              >
                Install MetaMask
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show connection error
  if (connectionError && !account) {
    return (
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
        <Button onClick={connectToMetaMask} disabled={isConnecting} className="w-full">
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      </div>
    )
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
        <Button onClick={connectToMetaMask} disabled={isConnecting} className="w-full">
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
