"use client"

import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function DebugPage() {
  const { user, loading, role } = useAuth()
  const [systemInfo, setSystemInfo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

  const handleCheckSystem = () => {
    setIsLoading(true)
    // Simulación de obtención de información del sistema
    setTimeout(() => {
      setSystemInfo(`
Sistema: RenovaHub
Versión: 1.0.0
Entorno: Producción
Base de datos: Firebase Firestore
Autenticación: Firebase Auth
Notificaciones: Habilitadas
Usuarios registrados: 12
Licencias activas: 45
Último backup: ${new Date().toLocaleString()}
      `)
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Herramientas de Debug</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
            <CardDescription>
              Muestra información detallada sobre el sistema actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCheckSystem} 
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar Sistema
            </Button>
            
            {systemInfo && (
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                {systemInfo}
              </pre>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Logs del Sistema</CardTitle>
            <CardDescription>
              Visualiza los logs recientes del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="mb-4">
              Ver Logs
            </Button>
            <p className="text-sm text-muted-foreground">
              Esta función permite a los administradores revisar los logs del sistema para diagnóstico de problemas.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Caché del Sistema</CardTitle>
            <CardDescription>
              Gestiona la caché del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="mb-4">
              Limpiar Caché
            </Button>
            <p className="text-sm text-muted-foreground">
              Utiliza esta opción con precaución. Limpiar la caché puede resolver problemas de rendimiento pero requiere recargar datos.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Prueba de Notificaciones</CardTitle>
            <CardDescription>
              Envía notificaciones de prueba
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="mb-4">
              Enviar Notificación de Prueba
            </Button>
            <p className="text-sm text-muted-foreground">
              Esta función permite probar el sistema de notificaciones enviando un mensaje de prueba.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}