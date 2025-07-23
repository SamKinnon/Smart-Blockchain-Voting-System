"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Vote } from "lucide-react"
import ElectionsList from "@/components/elections-list"
import VotingInterface from "@/components/voting-interface"
import ResultsDisplay from "@/components/results-display"

interface VoterDashboardProps {
  account: string
  onBack: () => void
}

export default function VoterDashboard({ account, onBack }: VoterDashboardProps) {
  const [activeTab, setActiveTab] = useState("elections")

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
              <ElectionsList account={account} />
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
