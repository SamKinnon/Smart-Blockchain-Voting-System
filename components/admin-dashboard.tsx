"use client"


import { useVotingContract } from "@/context/voting-contract-context"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import AdminPanel from "@/components/admin-panel"
import ElectionsManager from "@/components/elections-manager"
import CandidatesManager from "@/components/candidates-manager"

interface AdminDashboardProps {
  account: string
  isAdmin: boolean
  onBack: () => void
}


export default function AdminDashboard({ account, isAdmin, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("create")
  const { contract } = useVotingContract() // ← ADD THIS LINE

  useEffect(() => {
    const checkOwner = async () => {
      if (contract && account) {
        try {
          const owner = await contract.owner();
          console.log("=== CONTRACT DEBUG INFO ===");
          console.log("Contract Owner:", owner);
          console.log("Current Account:", account);
          console.log("Is Owner:", owner.toLowerCase() === account.toLowerCase());
          console.log("Contract Address:", contract.address);
        } catch (error) {
          console.error("Error checking owner:", error);
        }
      }
    };
    checkOwner();
  }, [contract, account]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        </div>
      </div>

      {!isAdmin && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Warning</AlertTitle>
          <AlertDescription>
            You are not the contract owner. Admin functions will fail. Please connect with the wallet that deployed the
            contract.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="create">Create Election</TabsTrigger>
          <TabsTrigger value="elections">Manage Elections</TabsTrigger>
          <TabsTrigger value="candidates">Manage Candidates</TabsTrigger>
          <TabsTrigger value="results">Publish Results</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Election</CardTitle>
              <CardDescription>Set up a new election with candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminPanel account={account} activeTab="create-election" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elections">
          <ElectionsManager account={account} />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidatesManager account={account} />
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Publish Election Results</CardTitle>
              <CardDescription>Make election results visible to voters</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminPanel account={account} activeTab="publish-results" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
