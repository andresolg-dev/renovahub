"use client"

import { useAuth } from "@/components/auth-provider"
import UsersTable from "@/components/users-table"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminPage() {
  const { user, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || role !== "Administrator") {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gestión de Usuarios</h1>
      <UsersTable />
    </div>
  )
}
