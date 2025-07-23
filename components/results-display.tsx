"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Trophy, Users, BarChart3 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface Election {
  id: number
  name: string
  resultsPublished: boolean
  hasEnded: boolean
}

interface CandidateResult {
  id: number
  name: string
  info: string
  voteCount: number
  percentage: number
}

export default function ResultsDisplay() {
  const [elections, setElections] = useState<Election[]>([])
  const [results, setResults] = useState<CandidateResult[]>([])
  const [selectedElection, setSelectedElection] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)

  const { toast } = useToast()
  const { contract } = useVotingContract()

  useEffect(() => {
    if (contract) {
      fetchElections()
    }
  }, [contract])

  useEffect(() => {
    if (selectedElection && contract) {
      fetchResults(Number.parseInt(selectedElection))
    } else {
      setResults([])
      setTotalVotes(0)
    }
  }, [selectedElection, contract])

  const fetchElections = async () => {
    try {
      setLoading(true)

      // Get election count from contract
      const count = await contract.getElectionCount()
      const electionsArray: Election[] = []

      // Fetch each election
      for (let i = 0; i < Number(count); i++) {
        const election = await contract.elections(i)
        const resultsPublished = await contract.resultsPublished(i)

        const now = Math.floor(Date.now() / 1000)
        const hasEnded = now > Number(election.endTime)

        // Only show elections with published results
        if (resultsPublished) {
          electionsArray.push({
            id: i,
            name: election.name,
            resultsPublished,
            hasEnded,
          })
        }
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

  const fetchResults = async (electionId: number) => {
    try {
      setLoadingResults(true)

      // Get candidate count for this election
      const count = await contract.getCandidateCount(electionId)
      const resultsArray: CandidateResult[] = []
      let total = 0

      // Fetch each candidate and their vote count
      for (let i = 0; i < Number(count); i++) {
        const candidate = await contract.getCandidate(electionId, i)
        const voteCount = await contract.getVoteCount(electionId, i)

        const voteCountNumber = Number(voteCount)

        resultsArray.push({
          id: i,
          name: candidate.name,
          info: candidate.info,
          voteCount: voteCountNumber,
          percentage: 0, // Will calculate after getting total
        })

        total += voteCountNumber
      }

      // Calculate percentages
      if (total > 0) {
        resultsArray.forEach((result) => {
          result.percentage = (result.voteCount / total) * 100
        })
      }

      // Sort by vote count (highest first)
      resultsArray.sort((a, b) => b.voteCount - a.voteCount)

      setResults(resultsArray)
      setTotalVotes(total)
    } catch (error) {
      console.error("Error fetching results:", error)
      toast({
        title: "Error",
        description: "Failed to fetch election results",
        variant: "destructive",
      })
    } finally {
      setLoadingResults(false)
    }
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
          <p className="text-center text-muted-foreground">No election results have been published yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>View Election Results</CardTitle>
          <CardDescription>Select an election to view its published results</CardDescription>
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
                      <Badge variant="outline" className="text-xs">
                        Results Published
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedElection && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Results</h3>
              <Button variant="outline" onClick={() => fetchResults(Number.parseInt(selectedElection))}>
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedElection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {elections.find((e) => e.id.toString() === selectedElection)?.name} - Results
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Votes: {totalVotes}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingResults ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No results available for this election.</p>
            ) : (
              <div className="space-y-6">
                {results.map((candidate, index) => (
                  <div key={candidate.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                        <h4 className="font-medium">{candidate.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Rank #{index + 1}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{candidate.voteCount} votes</div>
                        <div className="text-sm text-muted-foreground">{candidate.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <Progress value={candidate.percentage} className="h-2" />
                    <p className="text-sm text-muted-foreground">{candidate.info}</p>
                  </div>
                ))}

                {results.length > 0 && (
                  <div className="mt-6 p-4 bg-muted rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Winner</span>
                    </div>
                    <p className="text-sm">
                      <strong>{results[0].name}</strong> won with {results[0].voteCount} votes (
                      {results[0].percentage.toFixed(1)}% of total votes)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
