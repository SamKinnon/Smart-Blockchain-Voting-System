"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Users, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface ElectionsManagerProps {
  account: string
}

interface Election {
  id: number
  name: string
  description: string
  startTime: number
  endTime: number
  candidateCount: number
  totalVotes: number
  resultsPublished: boolean
  isActive: boolean
  hasEnded: boolean
}

export default function ElectionsManager({ account }: ElectionsManagerProps) {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [chainTime, setChainTime] = useState<number | null>(null)

  const { toast } = useToast()
  const { contract } = useVotingContract()

  // Fetch chain time every 10 seconds
  useEffect(() => {
    const getChainTime = async () => {
      if (contract?.runner?.provider) {
        const block = await contract.runner.provider.getBlock("latest")
        setChainTime(Number(block.timestamp))
      }
    }

    getChainTime()
    const interval = setInterval(getChainTime, 10_000)
    return () => clearInterval(interval)
  }, [contract])

  // Fetch elections
  useEffect(() => {
    if (contract && account) {
      fetchElections()
    }
  }, [contract, account])

  const fetchElections = async () => {
    try {
      setLoading(true)
      const count = await contract.getElectionCount()
      const electionsArray: Election[] = []

      for (let i = 0; i < count; i++) {
        const election = await contract.elections(i)
        const candidateCount = await contract.getCandidateCount(i)
        const resultsPublished = await contract.resultsPublished(i)

        const now = Math.floor(Date.now() / 1000)
        const isActive = now >= election.startTime && now <= election.endTime
        const hasEnded = now > election.endTime

        let totalVotes = 0
        if (resultsPublished) {
          for (let j = 0; j < candidateCount; j++) {
            const voteCount = await contract.getVoteCount(i, j)
            totalVotes += voteCount.toNumber()
          }
        }

        electionsArray.push({
          id: i,
          name: election.name,
          description: election.description,
          startTime: election.startTime,
          endTime: election.endTime,
          candidateCount: Number(candidateCount),
          totalVotes,
          resultsPublished,
          isActive,
          hasEnded
        })
      }

      setElections(electionsArray)
    } catch (error) {
      console.error("Error fetching elections:", error)
      toast({
        title: "Error",
        description: "Failed to fetch elections",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number | bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const getStatusBadge = (election: Election) => {
    if (election.isActive) {
      return <Badge className="bg-green-500">Active</Badge>
    }

    if (election.hasEnded) {
      return election.resultsPublished ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Results Published
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          Ended - Pending Results
        </Badge>
      )
    }

    return <Badge variant="secondary">Upcoming</Badge>
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
          <p className="text-center text-muted-foreground">No elections created yet</p>
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

      {chainTime && (
        <div className="text-sm text-muted-foreground text-right mb-2">
          ⏱️ Current Blockchain Time:{" "}
          <span className="font-medium text-black">
            {new Date(chainTime * 1000).toLocaleString()}
          </span>
        </div>
      )}

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
              {getStatusBadge(election)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  <div className="text-muted-foreground">
                    {election.resultsPublished ? `${election.totalVotes} Total Votes` : "Votes Hidden"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {election.resultsPublished ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="text-sm">
                  <div className="font-medium">Results {election.resultsPublished ? "Published" : "Hidden"}</div>
                  <div className="text-muted-foreground">
                    {election.hasEnded ? "Election Ended" : election.isActive ? "In Progress" : "Not Started"}
                  </div>
                </div>
              </div>
            </div>

            {election.hasEnded && !election.resultsPublished && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-sm text-orange-800">
                  This election has ended. You can publish the results in the "Publish Results" tab.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
