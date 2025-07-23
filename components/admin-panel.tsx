"use client"

import type React from "react"
import type { ElectionBasic } from "@/types"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, PlusCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface AdminPanelProps {
  account: string
  activeTab?: string
  preSelectedElection?: string
  onCandidateAdded?: () => void
}

export default function AdminPanel({
  account,
  activeTab = "create-election",
  preSelectedElection,
  onCandidateAdded,
}: AdminPanelProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)
  const [electionName, setElectionName] = useState("")
  const [electionDescription, setElectionDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [candidateName, setCandidateName] = useState("")
  const [candidateInfo, setCandidateInfo] = useState("")
  const [selectedElection, setSelectedElection] = useState<string | null>(null)
  const [publishElectionId, setPublishElectionId] = useState<string | null>(null)
  const [elections, setElections] = useState<ElectionBasic[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const { contract } = useVotingContract()

  const fetchElections = async () => {
    if (!contract) return

    try {
      setLoading(true)

      // Get election count from contract
      const count = await contract.getElectionCount()
      const electionsArray: ElectionBasic[] = []

      // Fetch each election
      for (let i = 0; i < Number(count); i++) {
        const election = await contract.elections(i)

        electionsArray.push({
          id: i,
          name: election.name,
        })
      }

      console.log("Fetched elections for admin panel:", electionsArray)
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

  // Fetch elections when component mounts or when switching to tabs that need elections
  useEffect(() => {
    if (contract && (currentTab === "add-candidate" || currentTab === "publish-results")) {
      fetchElections()
    }
  }, [contract, currentTab])

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contract) {
      toast({
        title: "Error",
        description: "Contract not initialized",
        variant: "destructive",
      })
      return
    }

    if (!electionName || !electionDescription || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)

    if (startTimestamp >= endTimestamp) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Call the createElection function on the smart contract
      const tx = await contract.createElection(electionName, electionDescription, startTimestamp, endTimestamp)

      // Wait for transaction to be mined
      await tx.wait()

      toast({
        title: "Success",
        description: "Election created successfully",
      })

      // Reset form
      setElectionName("")
      setElectionDescription("")
      setStartDate("")
      setEndDate("")

      // Refresh elections list
      fetchElections()
    } catch (error) {
      console.error("Error creating election:", error)
      toast({
        title: "Error",
        description: "Failed to create election",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contract) {
      toast({
        title: "Error",
        description: "Contract not initialized",
        variant: "destructive",
      })
      return
    }

    if (!selectedElection || !candidateName || !candidateInfo) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Call the addCandidate function on the smart contract
      const tx = await contract.addCandidate(Number.parseInt(selectedElection), candidateName, candidateInfo)

      // Wait for transaction to be mined
      await tx.wait()

      toast({
        title: "Success",
        description: "Candidate added successfully",
      })

      // Reset form
      setCandidateName("")
      setCandidateInfo("")

      // Call the callback if provided
      if (onCandidateAdded) {
        onCandidateAdded()
      }
    } catch (error) {
      console.error("Error adding candidate:", error)
      toast({
        title: "Error",
        description: "Failed to add candidate",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublishResults = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contract) {
      toast({
        title: "Error",
        description: "Contract not initialized",
        variant: "destructive",
      })
      return
    }

    if (!publishElectionId) {
      toast({
        title: "Error",
        description: "Please select an election",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Call the publishResults function on the smart contract
      const tx = await contract.publishResults(Number.parseInt(publishElectionId))

      // Wait for transaction to be mined
      await tx.wait()

      toast({
        title: "Success",
        description: "Results published successfully",
      })

      // Reset form
      setPublishElectionId(null)
    } catch (error) {
      console.error("Error publishing results:", error)
      toast({
        title: "Error",
        description: "Failed to publish results",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Set pre-selected election if provided
  useEffect(() => {
    if (preSelectedElection && currentTab === "add-candidate") {
      setSelectedElection(preSelectedElection)
    }
  }, [preSelectedElection, currentTab])

  // If activeTab is provided, don't show tabs - just show the specific content
  if (activeTab && activeTab !== "create-election") {
    if (activeTab === "add-candidate") {
      return (
        <form onSubmit={handleAddCandidate}>
          <div className="space-y-4">
            {!preSelectedElection && (
              <div className="space-y-2">
                <Label htmlFor="election-select">Select Election</Label>
                <Select value={selectedElection || ""} onValueChange={setSelectedElection}>
                  <SelectTrigger id="election-select">
                    <SelectValue placeholder="Select an election" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : elections.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">No elections found</div>
                    ) : (
                      elections.map((election) => (
                        <SelectItem key={election.id} value={election.id.toString()}>
                          {election.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="candidate-name">Candidate Name</Label>
              <Input
                id="candidate-name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate-info">Candidate Information</Label>
              <Textarea
                id="candidate-info"
                value={candidateInfo}
                onChange={(e) => setCandidateInfo(e.target.value)}
                placeholder="Brief description of the candidate..."
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || (!preSelectedElection && !selectedElection)}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Candidate
                </>
              )}
            </Button>
          </div>
        </form>
      )
    }

    if (activeTab === "publish-results") {
      return (
        <form onSubmit={handlePublishResults}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publish-election">Select Election</Label>
              <Select value={publishElectionId || ""} onValueChange={setPublishElectionId}>
                <SelectTrigger id="publish-election">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : elections.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No elections found</div>
                  ) : (
                    elections.map((election) => (
                      <SelectItem key={election.id} value={election.id.toString()}>
                        {election.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={submitting || !publishElectionId} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Results"
              )}
            </Button>
          </div>
        </form>
      )
    }
  }

  // Return the original tabbed interface for create-election or when no specific tab is requested
  return (
    <Tabs
      value={currentTab}
      onValueChange={(value) => {
        setCurrentTab(value)
        if (value !== "create-election") {
          fetchElections()
        }
      }}
    >
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="create-election">Create Election</TabsTrigger>
        <TabsTrigger value="add-candidate">Add Candidate</TabsTrigger>
        <TabsTrigger value="publish-results">Publish Results</TabsTrigger>
      </TabsList>

      <TabsContent value="create-election">
        <form onSubmit={handleCreateElection}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="election-name">Election Name</Label>
              <Input
                id="election-name"
                value={electionName}
                onChange={(e) => setElectionName(e.target.value)}
                placeholder="Presidential Election 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="election-description">Description</Label>
              <Textarea
                id="election-description"
                value={electionDescription}
                onChange={(e) => setElectionDescription(e.target.value)}
                placeholder="National election to elect the president..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Election
                </>
              )}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="add-candidate">
        <form onSubmit={handleAddCandidate}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="election-select">Select Election</Label>
              <Select value={selectedElection || ""} onValueChange={setSelectedElection}>
                <SelectTrigger id="election-select">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : elections.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No elections found</div>
                  ) : (
                    elections.map((election) => (
                      <SelectItem key={election.id} value={election.id.toString()}>
                        {election.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate-name">Candidate Name</Label>
              <Input
                id="candidate-name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate-info">Candidate Information</Label>
              <Textarea
                id="candidate-info"
                value={candidateInfo}
                onChange={(e) => setCandidateInfo(e.target.value)}
                placeholder="Brief description of the candidate..."
                required
              />
            </div>

            <Button type="submit" disabled={submitting || !selectedElection} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Candidate
                </>
              )}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="publish-results">
        <form onSubmit={handlePublishResults}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publish-election">Select Election</Label>
              <Select value={publishElectionId || ""} onValueChange={setPublishElectionId}>
                <SelectTrigger id="publish-election">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : elections.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No elections found</div>
                  ) : (
                    elections.map((election) => (
                      <SelectItem key={election.id} value={election.id.toString()}>
                        {election.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={submitting || !publishElectionId} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Results"
              )}
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  )
}
