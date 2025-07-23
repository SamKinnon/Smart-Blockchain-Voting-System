"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { User, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"
import AdminPanel from "@/components/admin-panel"

interface CandidatesManagerProps {
  account: string
}

interface Election {
  id: number
  name: string
  hasStarted: boolean
}

interface Candidate {
  id: number
  name: string
  info: string
  voteCount?: number
}

export default function CandidatesManager({ account }: CandidatesManagerProps) {
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedElection, setSelectedElection] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()
  const { contract } = useVotingContract()

  useEffect(() => {
    if (contract && account) {
      fetchElections()
    }
  }, [contract, account])

  useEffect(() => {
    if (selectedElection && contract) {
      fetchCandidates(Number.parseInt(selectedElection))
    } else {
      setCandidates([])
    }
  }, [selectedElection, contract])

  const fetchElections = async () => {
    try {
      setLoading(true)

      // Get election count from contract
      const count = await contract.getElectionCount()
      const electionsArray: Election[] = []

      // Fetch each election
      for (let i = 0; i < count; i++) {
        const election = await contract.elections(i)
        const now = Math.floor(Date.now() / 1000)
        const hasStarted = now >= election.startTime

        electionsArray.push({
          id: i,
          name: election.name,
          hasStarted,
        })
      }

      setElections(electionsArray)
    } catch (error) {
      console.error("Error fetching elections:", error)
      toast({
        title: "Error",
        description: "Failed to fetch elections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async (electionId: number) => {
    try {
      setLoadingCandidates(true)

      // Get candidate count for this election
      const count = await contract.getCandidateCount(electionId)
      const candidatesArray: Candidate[] = []

      // Check if results are published to show vote counts
      const resultsPublished = await contract.resultsPublished(electionId)

      // Fetch each candidate
      for (let i = 0; i < count; i++) {
        const candidate = await contract.getCandidate(electionId, i)

        let voteCount = undefined
        if (resultsPublished) {
          const votes = await contract.getVoteCount(electionId, i)
          voteCount = Number(votes)
        }

        candidatesArray.push({
          id: i,
          name: candidate.name,
          info: candidate.info,
          voteCount,
        })
      }

      setCandidates(candidatesArray)
    } catch (error) {
      console.error("Error fetching candidates:", error)
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
      })
    } finally {
      setLoadingCandidates(false)
    }
  }

  const handleCandidateAdded = () => {
    // Refresh candidates list after adding new candidate
    if (selectedElection) {
      fetchCandidates(Number.parseInt(selectedElection))
    }
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Skeleton className="h-8 w-8" />
        </CardContent>
      </Card>
    )
  }

  if (elections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No elections found. Create an election first.</p>
        </CardContent>
      </Card>
    )
  }

  const selectedElectionData = elections.find((e) => e.id.toString() === selectedElection)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Candidates</CardTitle>
          <CardDescription>View and add candidates to your elections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="election-select">Select Election</Label>
            <Select value={selectedElection || ""} onValueChange={setSelectedElection}>
              <SelectTrigger id="election-select">
                <SelectValue placeholder="Select an election" />
              </SelectTrigger>
              <SelectContent>
                {elections.map((election) => (
                  <SelectItem key={election.id} value={election.id.toString()}>
                    <div className="flex items-center gap-2">
                      {election.name}
                      {election.hasStarted && (
                        <Badge variant="outline" className="text-xs">
                          Started
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedElection && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Candidates ({candidates.length})</h3>
              {!selectedElectionData?.hasStarted && (
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && selectedElection && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
            <CardDescription>
              Add a candidate to {elections.find((e) => e.id.toString() === selectedElection)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPanel
              account={account}
              activeTab="add-candidate"
              preSelectedElection={selectedElection}
              onCandidateAdded={handleCandidateAdded}
            />
          </CardContent>
        </Card>
      )}

      {selectedElection && (
        <Card>
          <CardHeader>
            <CardTitle>Candidates List</CardTitle>
            {selectedElectionData?.hasStarted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">This election has started. No new candidates can be added.</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingCandidates ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No candidates added to this election yet.</p>
            ) : (
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-start space-x-3 p-3 border rounded-md">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{candidate.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          ID: {candidate.id}
                        </Badge>
                        {candidate.voteCount !== undefined && (
                          <Badge className="text-xs">{candidate.voteCount} votes</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{candidate.info}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
