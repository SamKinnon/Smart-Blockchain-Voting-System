"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, Bug, Clock, User } from "lucide-react"
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
  startTime: number
  endTime: number
  currentTime: number
}

interface Candidate {
  id: number
  name: string
  info: string
}

interface ValidationResult {
  canVote: boolean
  errors: string[]
  warnings: string[]
  debugInfo: any
}

export default function EnhancedVotingInterface({ account }: VotingInterfaceProps) {
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedElection, setSelectedElection] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voteSuccess, setVoteSuccess] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [showDebug, setShowDebug] = useState(false)

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
      validateVotingConditions(Number.parseInt(selectedElection))
    } else {
      setCandidates([])
      setValidation(null)
    }
    setSelectedCandidate(null)
  }, [selectedElection, contract])

  const fetchElections = async () => {
    try {
      setLoading(true)

      const count = await contract.getElectionCount()
      const electionsArray: Election[] = []

      for (let i = 0; i < Number(count); i++) {
        const election = await contract.elections(i)
        const hasVoted = await contract.hasVoted(i, account)

        // Get current block timestamp
        const provider = contract.runner?.provider
        const block = await provider?.getBlock("latest")
        const currentTime = block?.timestamp || Math.floor(Date.now() / 1000)

        // Safely convert BigInt to Number
        const startTime = Number(election.startTime)
        const endTime = Number(election.endTime)
        const isActive = currentTime >= startTime && currentTime <= endTime

        console.log(`Election ${i} Debug:`, {
          name: election.name,
          currentTime,
          startTime,
          endTime,
          isActive,
          hasVoted,
          timeDiff: currentTime - startTime,
          timeToEnd: endTime - currentTime,
        })

        electionsArray.push({
          id: i,
          name: election.name,
          isActive,
          hasVoted,
          startTime,
          endTime,
          currentTime,
        })
      }

      setElections(electionsArray)
    } catch (error) {
      console.error("Error fetching elections:", error)
      toast({
        title: "Error",
        description: `Failed to fetch elections: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async (electionId: number) => {
    try {
      const count = await contract.getCandidateCount(electionId)
      const candidatesArray: Candidate[] = []

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
        description: `Failed to fetch candidates: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const validateVotingConditions = async (electionId: number) => {
    try {
      const errors: string[] = []
      const warnings: string[] = []
      const debugInfo: any = {}

      // Get election data
      const election = await contract.elections(electionId)
      const hasVoted = await contract.hasVoted(electionId, account)
      const candidateCount = await contract.getCandidateCount(electionId)

      // Get current time
      const provider = contract.runner?.provider
      const block = await provider?.getBlock("latest")
      const currentTime = block?.timestamp || Math.floor(Date.now() / 1000)

      const startTime = Number(election.startTime)
      const endTime = Number(election.endTime)

      debugInfo.election = {
        name: election.name,
        exists: election.exists,
        startTime,
        endTime,
        currentTime,
        candidateCount: Number(candidateCount),
      }

      debugInfo.account = {
        address: account,
        hasVoted,
      }

      // Validation checks
      if (!election.exists) {
        errors.push("Election does not exist")
      }

      if (hasVoted) {
        errors.push("You have already voted in this election")
      }

      if (currentTime < startTime) {
        errors.push(`Election hasn't started yet. Starts at ${new Date(startTime * 1000).toLocaleString()}`)
      }

      if (currentTime > endTime) {
        errors.push(`Election has ended. Ended at ${new Date(endTime * 1000).toLocaleString()}`)
      }

      if (Number(candidateCount) === 0) {
        errors.push("No candidates available for this election")
      }

      // Warnings
      if (currentTime > endTime - 300) {
        // 5 minutes before end
        warnings.push("Election is ending soon!")
      }

      // Check account balance
      try {
        const balance = await provider?.getBalance(account)
        const balanceEth = balance ? Number(balance) / Math.pow(10, 18) : 0
        debugInfo.balance = balanceEth

        if (balanceEth < 0.001) {
          warnings.push("Low ETH balance. You might not have enough gas for the transaction.")
        }
      } catch (error) {
        warnings.push("Could not check account balance")
      }

      setValidation({
        canVote: errors.length === 0,
        errors,
        warnings,
        debugInfo,
      })
    } catch (error) {
      console.error("Error validating conditions:", error)
      setValidation({
        canVote: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`],
        warnings: [],
        debugInfo: {},
      })
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

    const electionId = Number.parseInt(selectedElection)
    const candidateId = Number.parseInt(selectedCandidate)

    try {
      setSubmitting(true)

      // Re-validate before voting
      await validateVotingConditions(electionId)

      if (validation && !validation.canVote) {
        toast({
          title: "Cannot Vote",
          description: validation.errors[0] || "Voting conditions not met",
          variant: "destructive",
        })
        return
      }

      console.log("Attempting to vote:", { electionId, candidateId, account })

      // First, try to estimate gas
      let gasEstimate
      try {
        gasEstimate = await contract.vote.estimateGas(electionId, candidateId)
        console.log("Gas estimate:", gasEstimate.toString())
      } catch (gasError) {
        console.error("Gas estimation failed:", gasError)

        // Try static call to get better error info
        try {
          await contract.vote.staticCall(electionId, candidateId)
        } catch (staticError: any) {
          console.error("Static call failed:", staticError)

          let errorMessage = "Transaction would fail"
          if (staticError.message) {
            if (staticError.message.includes("already voted")) {
              errorMessage = "You have already voted in this election"
            } else if (staticError.message.includes("not active")) {
              errorMessage = "Election is not currently active"
            } else if (staticError.message.includes("invalid")) {
              errorMessage = "Invalid election or candidate ID"
            } else {
              errorMessage = staticError.message
            }
          }

          throw new Error(errorMessage)
        }

        throw gasError
      }

      // Execute the transaction with extra gas
      const tx = await contract.vote(electionId, candidateId, {
        gasLimit: gasEstimate ? (gasEstimate * BigInt(120)) / BigInt(100) : undefined, // 20% extra gas
      })

      console.log("Transaction sent:", tx.hash)

      toast({
        title: "Transaction Sent",
        description: `Transaction hash: ${tx.hash.substring(0, 10)}...`,
      })

      // Wait for confirmation
      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)

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
        fetchElections()
      }, 3000)
    } catch (error: any) {
      console.error("Error voting:", error)

      let errorMessage = "Failed to submit your vote"

      if (error.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user"
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas"
        } else if (error.message.includes("already voted")) {
          errorMessage = "You have already voted in this election"
        } else if (error.message.includes("not active")) {
          errorMessage = "Election is not currently active"
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Transaction Failed",
        description: errorMessage,
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
          <p className="text-center text-muted-foreground">No elections available for voting.</p>
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cast Your Vote</CardTitle>
          <CardDescription>
            Select an election and candidate to cast your vote securely on the blockchain
          </CardDescription>
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
                    <div className="flex items-center gap-2">
                      {election.name}
                      {election.isActive && <span className="text-green-600">●</span>}
                      {election.hasVoted && <User className="h-3 w-3 text-blue-600" />}
                      {!election.isActive && <Clock className="h-3 w-3 text-gray-400" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {validation && (
            <div className="space-y-2">
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cannot Vote</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
                <Bug className="h-4 w-4 mr-2" />
                {showDebug ? "Hide" : "Show"} Debug Info
              </Button>

              {showDebug && (
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto">{JSON.stringify(validation.debugInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {selectedElection && candidates.length > 0 && validation?.canVote && (
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
            disabled={!selectedElection || !selectedCandidate || submitting || !validation?.canVote}
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
    </div>
  )
}
