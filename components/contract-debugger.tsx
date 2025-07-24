"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Bug, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useVotingContract } from "@/context/voting-contract-context"

interface ContractDebuggerProps {
  account: string
  electionId: number
  candidateId: number
}

interface DebugResult {
  test: string
  status: "pass" | "fail" | "unknown"
  value?: any
  error?: string
}

export default function ContractDebugger({ account, electionId, candidateId }: ContractDebuggerProps) {
  const [debugging, setDebugging] = useState(false)
  const [results, setResults] = useState<DebugResult[]>([])
  const { toast } = useToast()
  const { contract } = useVotingContract()

  const runDiagnostics = async () => {
    if (!contract) return

    setDebugging(true)
    const testResults: DebugResult[] = []

    try {
      // Test 1: Contract owner
      try {
        const owner = await contract.owner()
        testResults.push({
          test: "Contract Owner",
          status: "pass",
          value: owner,
        })
      } catch (error: any) {
        testResults.push({
          test: "Contract Owner",
          status: "fail",
          error: error.message,
        })
      }

      // Test 2: Election count
      try {
        const count = await contract.getElectionCount()
        testResults.push({
          test: "Election Count",
          status: "pass",
          value: count.toString(),
        })
      } catch (error: any) {
        testResults.push({
          test: "Election Count",
          status: "fail",
          error: error.message,
        })
      }

      // Test 3: Specific election data
      try {
        const election = await contract.elections(electionId)
        testResults.push({
          test: `Election ${electionId} Data`,
          status: "pass",
          value: {
            name: election.name,
            exists: election.exists,
            startTime: election.startTime.toString(),
            endTime: election.endTime.toString(),
          },
        })
      } catch (error: any) {
        testResults.push({
          test: `Election ${electionId} Data`,
          status: "fail",
          error: error.message,
        })
      }

      // Test 4: Candidate count
      try {
        const candidateCount = await contract.getCandidateCount(electionId)
        testResults.push({
          test: `Candidate Count for Election ${electionId}`,
          status: "pass",
          value: candidateCount.toString(),
        })
      } catch (error: any) {
        testResults.push({
          test: `Candidate Count for Election ${electionId}`,
          status: "fail",
          error: error.message,
        })
      }

      // Test 5: Specific candidate data
      try {
        const candidate = await contract.getCandidate(electionId, candidateId)
        testResults.push({
          test: `Candidate ${candidateId} Data`,
          status: "pass",
          value: {
            name: candidate.name,
            info: candidate.info,
          },
        })
      } catch (error: any) {
        testResults.push({
          test: `Candidate ${candidateId} Data`,
          status: "fail",
          error: error.message,
        })
      }

      // Test 6: Has voted check
      try {
        const hasVoted = await contract.hasVoted(electionId, account)
        testResults.push({
          test: "Has Voted Check",
          status: hasVoted ? "fail" : "pass",
          value: hasVoted.toString(),
        })
      } catch (error: any) {
        testResults.push({
          test: "Has Voted Check",
          status: "fail",
          error: error.message,
        })
      }

      // Test 7: Block timestamp vs election times
      try {
        const provider = contract.runner?.provider
        if (provider) {
          const block = await provider.getBlock("latest")
          const blockTime = block?.timestamp || 0
          const election = await contract.elections(electionId)
          const startTime = Number(election.startTime)
          const endTime = Number(election.endTime)

          const isActive = blockTime >= startTime && blockTime <= endTime

          testResults.push({
            test: "Block Time vs Election Time",
            status: isActive ? "pass" : "fail",
            value: {
              blockTime,
              startTime,
              endTime,
              isActive,
            },
          })
        }
      } catch (error: any) {
        testResults.push({
          test: "Block Time vs Election Time",
          status: "fail",
          error: error.message,
        })
      }

      // Test 8: Try static call (simulation)
      try {
        await contract.vote.staticCall(electionId, candidateId)
        testResults.push({
          test: "Vote Static Call (Simulation)",
          status: "pass",
          value: "Transaction would succeed",
        })
      } catch (error: any) {
        testResults.push({
          test: "Vote Static Call (Simulation)",
          status: "fail",
          error: error.message,
        })
      }

      // Test 9: Gas estimation
      try {
        const gasEstimate = await contract.vote.estimateGas(electionId, candidateId)
        testResults.push({
          test: "Gas Estimation",
          status: "pass",
          value: gasEstimate.toString(),
        })
      } catch (error: any) {
        testResults.push({
          test: "Gas Estimation",
          status: "fail",
          error: error.message,
        })
      }

      // Test 10: Account balance
      try {
        const provider = contract.runner?.provider
        if (provider) {
          const balance = await provider.getBalance(account)
          const balanceEth = Number(balance) / Math.pow(10, 18)
          testResults.push({
            test: "Account Balance",
            status: balanceEth > 0 ? "pass" : "fail",
            value: `${balanceEth.toFixed(4)} ETH`,
          })
        }
      } catch (error: any) {
        testResults.push({
          test: "Account Balance",
          status: "fail",
          error: error.message,
        })
      }

      // Test 11: Network and contract interaction
      try {
        const provider = contract.runner?.provider
        if (provider) {
          const network = await provider.getNetwork()
          const code = await provider.getCode(contract.target)
          testResults.push({
            test: "Network & Contract",
            status: code.length > 2 ? "pass" : "fail",
            value: {
              chainId: network.chainId.toString(),
              contractCodeLength: code.length,
            },
          })
        }
      } catch (error: any) {
        testResults.push({
          test: "Network & Contract",
          status: "fail",
          error: error.message,
        })
      }

      setResults(testResults)
    } catch (error) {
      console.error("Error running diagnostics:", error)
      toast({
        title: "Error",
        description: "Failed to run diagnostics",
        variant: "destructive",
      })
    } finally {
      setDebugging(false)
    }
  }

  const getStatusIcon = (status: "pass" | "fail" | "unknown") => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Contract Diagnostics
        </CardTitle>
        <CardDescription>Run comprehensive tests to identify why the vote transaction is failing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={debugging} className="w-full">
          {debugging ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Bug className="mr-2 h-4 w-4" />
              Run Full Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Diagnostic Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-md">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="font-medium text-sm">{result.test}</div>
                  {result.value && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {typeof result.value === "object" ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(result.value, null, 2)}</pre>
                      ) : (
                        result.value
                      )}
                    </div>
                  )}
                  {result.error && <div className="text-xs text-red-600 mt-1 font-mono">{result.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <Alert>
            <Bug className="h-4 w-4" />
            <AlertTitle>Analysis</AlertTitle>
            <AlertDescription>
              {results.filter((r) => r.status === "fail").length === 0
                ? "All tests passed! The issue might be a race condition or network timing issue. Try voting again."
                : `${results.filter((r) => r.status === "fail").length} test(s) failed. Check the failed tests above for the root cause.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
