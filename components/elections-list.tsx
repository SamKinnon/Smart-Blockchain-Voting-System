"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Users, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface ElectionsListProps {
  account: string
}

interface Election {
  id: number
  name: string
  description: string
  startTime: number
  endTime: number
  isActive: boolean
  hasVoted: boolean
  candidateCount: number
  hasEnded: boolean
  isUpcoming: boolean
}

export default function ElectionsList({ account }: ElectionsListProps) {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { contract } = useVotingContract()

  useEffect(() => {
    if (contract && account) {
      fetchElections()
    }
  }, [contract, account])

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
        const candidateCount = await contract.getCandidateCount(i)

        const now = Math.floor(Date.now() / 1000)

        // Convert BigInt to Number for time comparison
        const startTime = Number(election.startTime)
        const endTime = Number(election.endTime)
        const isActive = now >= startTime && now <= endTime
        const hasEnded = now > endTime
        const isUpcoming = now < startTime

        console.log(`Election ${i}:`, {
          name: election.name,
          now,
          startTime,
          endTime,
          isActive,
          hasVoted,
          hasEnded,
          isUpcoming,
        })

        electionsArray.push({
          id: i,
          name: election.name,
          description: election.description,
          startTime: startTime,
          endTime: endTime,
          isActive,
          hasVoted,
          candidateCount: Number(candidateCount),
          hasEnded,
          isUpcoming,
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getStatusBadge = (election: Election) => {
    if (election.isActive) {
      return <Badge className="bg-green-500">Active</Badge>
    }
    if (election.hasEnded) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          Ended
        </Badge>
      )
    }
    if (election.isUpcoming) {
      return <Badge variant="secondary">Upcoming</Badge>
    }
    return <Badge variant="outline">Unknown</Badge>
  }

  const getVotingStatus = (election: Election) => {
    if (election.hasVoted) {
      return <Badge className="bg-blue-500">Voted</Badge>
    }
    if (election.isActive) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Can Vote
        </Badge>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (elections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No elections available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">All Elections ({elections.length})</h3>
        <Button variant="outline" onClick={fetchElections}>
          Refresh
        </Button>
      </div>

      {elections.map((election) => (
        <Card key={election.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {election.name}
                  <span className="text-sm font-normal text-muted-foreground">(ID: {election.id})</span>
                </CardTitle>
                <CardDescription>{election.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(election)}
                {getVotingStatus(election)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">Start: {formatDate(election.startTime)}</div>
                  <div className="text-muted-foreground">End: {formatDate(election.endTime)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">{election.candidateCount} Candidates</div>
                  <div className="text-muted-foreground">{election.hasVoted ? "You have voted" : "Vote not cast"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">
                    {election.isActive ? "Active Now" : election.hasEnded ? "Ended" : "Upcoming"}
                  </div>
                  <div className="text-muted-foreground">
                    {election.isActive && !election.hasVoted
                      ? "You can vote now"
                      : election.hasVoted
                        ? "Thank you for voting"
                        : election.hasEnded
                          ? "Voting closed"
                          : "Voting not started"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
