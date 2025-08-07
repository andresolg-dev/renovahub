"use client"

import { useAuth } from "@/components/auth-provider"
import MainDashboard from "@/components/main-dashboard"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="w-full px-4 py-6 mx-auto">
      <MainDashboard />
    </div>
  )
}