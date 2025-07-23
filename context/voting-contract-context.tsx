"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import VotingContract from "@/contracts/VotingSystem.json"

interface VotingContractContextType {
  contract: ethers.Contract | null
  loading: boolean
  error: string | null
}

const VotingContractContext = createContext<VotingContractContextType>({
  contract: null,
  loading: true,
  error: null,
})

export const useVotingContract = () => useContext(VotingContractContext)

interface VotingContractProviderProps {
  children: ReactNode
}

export const VotingContractProvider = ({ children }: VotingContractProviderProps) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeContract = async () => {
      if (typeof window === "undefined" || !window.ethereum) {
        setLoading(false)
        return
      }

      try {
        // Connect to the Ethereum network
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        // For demo purposes, we'll use a hardcoded contract address
        // In a real app, this would come from environment variables or deployment
        const contractAddress = "0x4c387D6930b6f5220980DE8473F5c3a756a7179e" // Example address

        // Create contract instance
        const votingContract = new ethers.Contract(contractAddress, VotingContract.abi, signer)

        setContract(votingContract)
        setError(null)
      } catch (err) {
        console.error("Failed to initialize contract:", err)
        setError("Failed to initialize contract. Please make sure MetaMask is connected.")
      } finally {
        setLoading(false)
      }
    }

    initializeContract()
  }, [])

  return (
    <VotingContractContext.Provider value={{ contract, loading, error }}>{children}</VotingContractContext.Provider>
  )
}
