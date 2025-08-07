"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Bell, Users, CheckCircle, AlertTriangle, RefreshCw, Send, BarChart3 } from "lucide-react"

interface FCMStats {
  totalTokens: number
  usersWithTokens: number
  activeTokens: number
  totalUsers: number
  tokensByUser: { [email: string]: number }
}

interface LicenseStats {
  totalLicenses: number
  expiringLicenses: number
  healthyLicenses: number
}

interface TestResult {
  id: string
  timestamp: string
  type: string
  success: boolean
  message: string
  details?: any
}

export default function NotificationsAdminPanel() {
  const [fcmStats, setFcmStats] = useState<FCMStats | null>(null)
  const [licenseStats, setLicenseStats] = useState<LicenseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testMessage, setTestMessage] = useState("")
  const { toast } = useToast()

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notifications/stats")
      if (!response.ok) throw new Error("Failed to load stats")

      const data = await response.json()
      setFcmStats(data.fcmStats)
      setLicenseStats(data.licenseStats)

      toast({
        title: "Estadísticas actualizadas",
        description: "Los datos se han cargado correctamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error al cargar estadísticas",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test_notification",
          message: testMessage || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to send test notification")

      const result = await response.json()

      const testResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "Test Notification",
        success: true,
        message: `Enviado a ${result.successCount} dispositivos`,
        details: result,
      }

      setTestResults((prev) => [testResult, ...prev.slice(0, 9)])

      toast({
        title: "Notificación de prueba enviada",
        description: `Enviada exitosamente a ${result.successCount} dispositivos.`,
      })
    } catch (error: any) {
      const testResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "Test Notification",
        success: false,
        message: error.message,
      }

      setTestResults((prev) => [testResult, ...prev.slice(0, 9)])

      toast({
        title: "Error al enviar notificación",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkAllLicenses = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "license_check" }),
      })

      if (!response.ok) throw new Error("Failed to check licenses")

      const result = await response.json()

      const testResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "License Check",
        success: true,
        message: `Verificadas ${result.totalLicensesChecked} licencias, enviadas ${result.totalNotificationsSent} notificaciones`,
        details: result,
      }

      setTestResults((prev) => [testResult, ...prev.slice(0, 9)])

      toast({
        title: "Verificación completada",
        description: `Se verificaron ${result.totalLicensesChecked} licencias y se enviaron ${result.totalNotificationsSent} notificaciones.`,
      })
    } catch (error: any) {
      const testResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: "License Check",
        success: false,
        message: error.message,
      }

      setTestResults((prev) => [testResult, ...prev.slice(0, 9)])

      toast({
        title: "Error en verificación",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
    toast({
      title: "Historial limpiado",
      description: "Se ha eliminado el historial de pruebas.",
    })
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Panel de Notificaciones</h1>
          <p className="text-muted-foreground">Sistema de notificaciones basado en eventos</p>
        </div>
        <Button onClick={loadStats} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">
            <BarChart3 className="mr-2 h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="tests">
            <Bell className="mr-2 h-4 w-4" />
            Pruebas
          </TabsTrigger>
          <TabsTrigger value="results">
            <CheckCircle className="mr-2 h-4 w-4" />
            Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens FCM</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fcmStats?.totalTokens || 0}</div>
                <p className="text-xs text-muted-foreground">{fcmStats?.activeTokens || 0} activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fcmStats?.usersWithTokens || 0}</div>
                <p className="text-xs text-muted-foreground">de {fcmStats?.totalUsers || 0} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Licencias Activas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{licenseStats?.totalLicenses || 0}</div>
                <p className="text-xs text-muted-foreground">{licenseStats?.healthyLicenses || 0} saludables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{licenseStats?.expiringLicenses || 0}</div>
                <p className="text-xs text-muted-foreground">próximos 30 días</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Tokens por Usuario</CardTitle>
              <CardDescription>Usuarios registrados para recibir notificaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {fcmStats?.tokensByUser && Object.keys(fcmStats.tokensByUser).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(fcmStats.tokensByUser).map(([email, count]) => (
                    <div key={email} className="flex justify-between items-center">
                      <span className="text-sm">{email}</span>
                      <Badge variant="secondary">
                        {count} token{count > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay usuarios con tokens FCM registrados.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pruebas de Conectividad</CardTitle>
                <CardDescription>Verifica el estado del sistema de notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={loadStats} disabled={loading} className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Obtener Estadísticas
                </Button>
                <Button onClick={checkAllLicenses} disabled={loading} className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Verificar Licencias por Vencer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pruebas Funcionales</CardTitle>
                <CardDescription>Envía notificaciones de prueba</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Mensaje personalizado (opcional)</Label>
                  <Textarea
                    id="testMessage"
                    placeholder="Mensaje de prueba personalizado..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={sendTestNotification} disabled={loading} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Notificación de Prueba
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Historial de Pruebas</CardTitle>
                <CardDescription>Resultados de las últimas 10 pruebas realizadas</CardDescription>
              </div>
              <Button variant="outline" onClick={clearResults} disabled={testResults.length === 0}>
                Limpiar Historial
              </Button>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay resultados de pruebas disponibles. Ejecuta algunas pruebas desde la pestaña "Pruebas".
                </p>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.success ? "default" : "destructive"}>{result.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className="text-sm">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalles</summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
