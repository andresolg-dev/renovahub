"use client"

import { useAuth } from "@/components/auth-provider"
import LicensesTable from "@/components/licenses-table"
import UpcomingLicensesDashboard from "@/components/upcoming-licenses-dashboard"
import { Loader2 } from "lucide-react"

export default function LicensesPage() {
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
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Licencias</h1>
      <UpcomingLicensesDashboard />
      <LicensesTable />
    </div>
  )
}