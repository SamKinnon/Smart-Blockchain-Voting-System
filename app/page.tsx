// app/page.tsx

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, Shield, Vote } from 'lucide-react'
import ConnectWallet from "@/components/connect-wallet"
import VoterDashboard from "@/components/voter-dashboard"
import AdminDashboard from "@/components/admin-dashboard"
import { VotingContractProvider, useVotingContract } from "@/context/voting-contract-context" // ← ADD useVotingContract here

// Create a separate component that uses the context
function VotingApp() {
  const [account, setAccount] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userType, setUserType] = useState<"admin" | "voter" | null>(null)
  const { contract } = useVotingContract() // ← NOW you can use contract here

  useEffect(() => {
    // Check if the connected account is the admin
    if (account) {
      checkAdminStatus(account)
    } else {
      setIsAdmin(false)
      setUserType(null)
    }
  }, [account, contract]) // ← Add contract as dependency

  const checkAdminStatus = async (address: string) => {
    try {
      // Now contract is available here
      if (contract) {
        const owner = await contract.owner()
        const isAdminUser = address.toLowerCase() === owner.toLowerCase()
        setIsAdmin(isAdminUser)
        console.log("Contract Owner:", owner)
        console.log("Current Account:", address)
        console.log("Is Admin:", isAdminUser)
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
    }
  }

  const handleUserTypeSelect = (type: "admin" | "voter") => {
    setUserType(type)
  }

  return (
    <main className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-center">Blockchain Voting System</h1>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          A secure and transparent voting system powered by Ethereum blockchain
        </p>

        <ConnectWallet account={account} setAccount={setAccount} />
      </div>

      {!account ? (
        <Alert className="max-w-2xl mx-auto">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Connect your wallet</AlertTitle>
          <AlertDescription>
            Please connect your MetaMask wallet to access the voting system. Make sure you select the correct account
            for your role (Admin or Voter).
          </AlertDescription>
        </Alert>
      ) : !userType ? (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Select Your Role</CardTitle>
              <CardDescription>Choose how you want to access the voting system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                  onClick={() => handleUserTypeSelect("admin")}
                >
                  <CardContent className="pt-6 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Admin Panel</h3>
                    <p className="text-muted-foreground">Create elections, manage candidates, and publish results</p>
                    {isAdmin && (
                      <div className="mt-3 text-sm text-green-600 font-medium">✓ You have admin privileges</div>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                  onClick={() => handleUserTypeSelect("voter")}
                >
                  <CardContent className="pt-6 text-center">
                    <Vote className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Voter Panel</h3>
                    <p className="text-muted-foreground">View elections, cast your vote, and see results</p>
                    <div className="mt-3 text-sm text-blue-600 font-medium">Available for all users</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : userType === "admin" ? (
        <AdminDashboard account={account} isAdmin={isAdmin} onBack={() => setUserType(null)} />
      ) : (
        <VoterDashboard account={account} onBack={() => setUserType(null)} />
      )}
    </main>
  )
}

// Main component that provides the context
export default function Home() {
  return (
    <VotingContractProvider>
      <VotingApp />
    </VotingContractProvider>
  )
}