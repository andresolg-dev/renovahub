"use client"

import { useAuth } from "@/components/auth-provider"
import SMTPConfig from "@/components/smtp-config"
import { Loader2 } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SMTPConfigPage() {
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
      <h1 className="text-3xl font-bold mb-6">Configuración de Email</h1>
      <SMTPConfig />
    </div>
  )
}