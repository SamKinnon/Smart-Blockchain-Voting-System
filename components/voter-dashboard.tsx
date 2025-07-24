"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Vote } from "lucide-react"
import ElectionsList from "@/components/elections-list"
import VotingInterface from "@/components/voting-interface"
import ResultsDisplay from "@/components/results-display"
import { useVotingContract } from "@/context/voting-contract-context"

interface VoterDashboardProps {
  account: string
  onBack: () => void
}

export default function VoterDashboard({ account, onBack }: VoterDashboardProps) {
  const [activeTab, setActiveTab] = useState("elections")
  const { contract } = useVotingContract()
  const [blockTime, setBlockTime] = useState<number | null>(null)

  const fetchBlockchainTime = async () => {
    if (!contract?.runner?.provider) return
    try {
      const block = await contract.runner.provider.getBlock("latest")
      setBlockTime(block.timestamp)
    } catch (err) {
      console.error("Failed to fetch blockchain time:", err)
    }
  }

  // Fetch blockchain time every 10 seconds automatically
  useEffect(() => {
    fetchBlockchainTime()
    const interval = setInterval(fetchBlockchainTime, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [contract])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Vote className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Voter Dashboard</h2>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="elections">View Elections</TabsTrigger>
          <TabsTrigger value="vote">Cast Vote</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>

        <TabsContent value="elections">
          <Card>
            <CardHeader>
              <CardTitle>Available Elections</CardTitle>
              <CardDescription>Browse all elections and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Display Current Blockchain Time */}
              {blockTime && (
                <div className="text-sm text-muted-foreground mb-4">
                  ⏱️ Current Blockchain Time:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(blockTime * 1000).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Pass blockTime and setBlockTime to ElectionsList */}
              <ElectionsList account={account} blockTime={blockTime} refreshBlockTime={fetchBlockchainTime} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vote">
          <Card>
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <CardDescription>Select an election and candidate to vote</CardDescription>
            </CardHeader>
            <CardContent>
              <VotingInterface account={account} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Election Results</CardTitle>
              <CardDescription>View published election results</CardDescription>
            </CardHeader>
            <CardContent>
              <ResultsDisplay />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
