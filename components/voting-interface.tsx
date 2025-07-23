"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface VotingInterfaceProps {
  account: string
}

interface Election {
  id: number
  name: string
  isActive: boolean
  hasVoted: boolean
}

interface Candidate {
  id: number
  name: string
  info: string
}

export default function VotingInterface({ account }: VotingInterfaceProps) {
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedElection, setSelectedElection] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voteSuccess, setVoteSuccess] = useState(false)

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
    setSelectedCandidate(null)
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
        const hasVoted = await contract.hasVoted(i, account)

        const now = Math.floor(Date.now() / 1000)

        // ✅ Fix: Convert BigInt to Number for time comparison
        const startTime = Number(election.startTime)
        const endTime = Number(election.endTime)
        const isActive = now >= startTime && now <= endTime

        console.log(`Election ${i} (Voting):`, {
          name: election.name,
          now,
          startTime,
          endTime,
          isActive,
          hasVoted,
        })

        // Only add active elections where the user hasn't voted
        if (isActive && !hasVoted) {
          electionsArray.push({
            id: i,
            name: election.name,
            isActive,
            hasVoted,
          })
        }
      }

      console.log("Active elections for voting:", electionsArray)
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
      setLoading(true)

      // Get candidate count for this election
      const count = await contract.getCandidateCount(electionId)
      const candidatesArray: Candidate[] = []

      // Fetch each candidate
      for (let i = 0; i < Number(count); i++) {
        const candidate = await contract.getCandidate(electionId, i)

        candidatesArray.push({
          id: i,
          name: candidate.name,
          info: candidate.info,
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
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedElection || !selectedCandidate || !contract) {
      toast({
        title: "Error",
        description: "Please select both an election and a candidate",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Call the vote function on the smart contract
      const tx = await contract.vote(Number.parseInt(selectedElection), Number.parseInt(selectedCandidate))

      // Wait for transaction to be mined
      await tx.wait()

      setVoteSuccess(true)
      toast({
        title: "Success",
        description: "Your vote has been recorded on the blockchain",
      })

      // Reset form after successful vote
      setTimeout(() => {
        setSelectedElection(null)
        setSelectedCandidate(null)
        setVoteSuccess(false)
        fetchElections() // Refresh elections list
      }, 3000)
    } catch (error) {
      console.error("Error voting:", error)
      toast({
        title: "Error",
        description: "Failed to submit your vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !selectedElection) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (elections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No active elections available for voting or you have already voted in all active elections.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (voteSuccess) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">Vote Submitted Successfully!</h3>
          <p className="text-muted-foreground text-center">Your vote has been securely recorded on the blockchain.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cast Your Vote</CardTitle>
        <CardDescription>Select an election and candidate to cast your vote securely on the blockchain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="election">Select Election</Label>
          <Select value={selectedElection || ""} onValueChange={setSelectedElection}>
            <SelectTrigger id="election">
              <SelectValue placeholder="Select an election" />
            </SelectTrigger>
            <SelectContent>
              {elections.map((election) => (
                <SelectItem key={election.id} value={election.id.toString()}>
                  {election.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedElection && candidates.length > 0 && (
          <div className="space-y-2">
            <Label>Select Candidate</Label>
            <RadioGroup value={selectedCandidate || ""} onValueChange={setSelectedCandidate} className="space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-start space-x-2 border rounded-md p-3">
                  <RadioGroupItem value={candidate.id.toString()} id={`candidate-${candidate.id}`} />
                  <div className="grid gap-1">
                    <Label htmlFor={`candidate-${candidate.id}`} className="font-medium">
                      {candidate.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{candidate.info}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {selectedElection && candidates.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No candidates found for this election</p>
          </div>
        )}

        {selectedElection && loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleVote}
          disabled={!selectedElection || !selectedCandidate || submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Vote...
            </>
          ) : (
            "Cast Vote"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
