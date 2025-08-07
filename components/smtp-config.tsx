"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Shield, Server, TestTube, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EmailConfig {
  enabled: boolean
  provider: 'resend' | 'smtp'
  // Resend config
  resendApiKey?: string
  // SMTP config
  host?: string
  port?: number
  secure?: boolean
  user?: string
  password?: string
  // Common config
  fromName: string
  fromEmail: string
  testEmail?: string
}

const SMTP_PROVIDERS = [
  {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    description: "Usar contraseña de aplicación"
  },
  {
    name: "Outlook/Hotmail",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    description: "Usar autenticación OAuth2 o contraseña"
  },
  {
    name: "Yahoo",
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    description: "Usar contraseña de aplicación"
  },
  {
    name: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    description: "Usar API Key como contraseña"
  },
  {
    name: "Mailgun",
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    description: "Usar credenciales SMTP de Mailgun"
  },
  {
    name: "Custom",
    host: "",
    port: 587,
    secure: false,
    description: "Configuración personalizada"
  }
]

export default function SMTPConfig() {
  const [config, setConfig] = useState<EmailConfig>({
    enabled: false,
    provider: 'resend',
    resendApiKey: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromName: 'RenovaHub',
    fromEmail: '',
    testEmail: ''
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedSMTPProvider, setSelectedSMTPProvider] = useState("Custom")
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/config/email")
      if (response.ok) {
        const data = await response.json()
        setConfig(data.config || config)
      }
    } catch (error) {
      console.error("Error loading email config:", error)
    }
  }

  const handleSMTPProviderChange = (providerName: string) => {
    setSelectedSMTPProvider(providerName)
    const provider = SMTP_PROVIDERS.find(p => p.name === providerName)
    if (provider && provider.name !== "Custom") {
      setConfig(prev => ({
        ...prev,
        host: provider.host,
        port: provider.port,
        secure: provider.secure
      }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/config/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar configuración")
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración de email se ha guardado correctamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!config.testEmail) {
      toast({
        title: "Email requerido",
        description: "Ingresa un email para enviar la prueba.",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch("/api/config/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          config,
          testEmail: config.testEmail 
        }),
      })

      const result = await response.json()
      
      setTestResult({
        success: response.ok,
        message: result.message || (response.ok ? "Email enviado correctamente" : "Error al enviar email")
      })

      if (response.ok) {
        toast({
          title: "Prueba exitosa",
          description: "El email de prueba se envió correctamente.",
        })
      } else {
        toast({
          title: "Error en la prueba",
          description: result.error || "No se pudo enviar el email de prueba.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message
      })
      toast({
        title: "Error en la prueba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Email</h1>
        <p className="text-muted-foreground">
          Configura el servicio de correo para enviar notificaciones automáticas
        </p>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Estado del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar envío de emails</Label>
              <p className="text-sm text-muted-foreground">
                Activar notificaciones automáticas por email
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
            />
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <Tabs 
          value={config.provider} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, provider: value as 'resend' | 'smtp' }))}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resend" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Resend (Recomendado)
            </TabsTrigger>
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              SMTP Personalizado
            </TabsTrigger>
          </TabsList>

          {/* Resend Configuration */}
          <TabsContent value="resend" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Configuración Resend
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Resend es un servicio moderno de email con excelente deliverability y fácil configuración.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-api-key">API Key de Resend</Label>
                  <Input
                    id="resend-api-key"
                    type="password"
                    value={config.resendApiKey || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, resendApiKey: e.target.value }))}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtén tu API Key en{' '}
                    <a 
                      href="https://resend.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      resend.com/api-keys
                    </a>
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">✨ Ventajas de Resend:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Configuración simple con solo API Key</li>
                    <li>• Excelente deliverability (99%+ de emails llegan)</li>
                    <li>• Dashboard con analytics detallados</li>
                    <li>• Soporte para dominios personalizados</li>
                    <li>• 3,000 emails gratis por mes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMTP Configuration */}
          <TabsContent value="smtp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Configuración SMTP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Proveedor de Email</Label>
                  <Select value={selectedSMTPProvider} onValueChange={handleSMTPProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SMTP_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.name} value={provider.name}>
                          <div className="flex flex-col">
                            <span>{provider.name}</span>
                            <span className="text-xs text-muted-foreground">{provider.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Host */}
                <div className="space-y-2">
                  <Label htmlFor="host">Host SMTP</Label>
                  <Input
                    id="host"
                    value={config.host || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                {/* Port and Security */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="port">Puerto</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.port || 587}
                      onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conexión Segura</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        checked={config.secure || false}
                        onCheckedChange={(secure) => setConfig(prev => ({ ...prev, secure }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {config.secure ? "TLS/SSL" : "STARTTLS"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Authentication */}
                <div className="space-y-2">
                  <Label htmlFor="user">Usuario/Email</Label>
                  <Input
                    id="user"
                    value={config.user || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
                    placeholder="tu-email@gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Contraseña o API Key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para Gmail, usa una contraseña de aplicación. Para SendGrid, usa tu API Key.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Common Email Settings */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración de Remitente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">Nombre del Remitente</Label>
              <Input
                id="fromName"
                value={config.fromName}
                onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                placeholder="RenovaHub"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email del Remitente</Label>
              <Input
                id="fromEmail"
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="noreply@tuempresa.com"
              />
              <p className="text-xs text-muted-foreground">
                Este email aparecerá como remitente en las notificaciones
              </p>
            </div>

            {/* Test Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <Label>Probar Configuración</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email de Prueba</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={config.testEmail || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, testEmail: e.target.value }))}
                  placeholder="test@ejemplo.com"
                />
              </div>

              <Button
                onClick={handleTest}
                disabled={testing || !isConfigValid()}
                className="w-full"
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando prueba...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Enviar Email de Prueba
                  </>
                )}
              </Button>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>

      {/* Configuration Tips */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Consejos de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="resend" className="w-full">
              <TabsList>
                <TabsTrigger value="resend">Resend</TabsTrigger>
                <TabsTrigger value="gmail">Gmail</TabsTrigger>
                <TabsTrigger value="outlook">Outlook</TabsTrigger>
                <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resend" className="space-y-2">
                <h4 className="font-semibold">Configuración Resend</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Crea una cuenta en <a href="https://resend.com" target="_blank" className="text-blue-600 hover:underline">resend.com</a></li>
                  <li>• Ve a API Keys y crea una nueva clave</li>
                  <li>• Copia la clave que empieza con "re_"</li>
                  <li>• Verifica tu dominio para mejor deliverability</li>
                </ul>
              </TabsContent>
              
              <TabsContent value="gmail" className="space-y-2">
                <h4 className="font-semibold">Gmail</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Habilita la verificación en 2 pasos</li>
                  <li>• Crea una contraseña de aplicación</li>
                  <li>• Usa smtp.gmail.com:587</li>
                  <li>• Habilita "Acceso de apps menos seguras" si es necesario</li>
                </ul>
              </TabsContent>
              
              <TabsContent value="outlook" className="space-y-2">
                <h4 className="font-semibold">Outlook/Hotmail</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Usa smtp-mail.outlook.com:587</li>
                  <li>• Habilita STARTTLS</li>
                  <li>• Usa tu email y contraseña normales</li>
                  <li>• Considera usar OAuth2 para mayor seguridad</li>
                </ul>
              </TabsContent>
              
              <TabsContent value="sendgrid" className="space-y-2">
                <h4 className="font-semibold">SendGrid</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Usa smtp.sendgrid.net:587</li>
                  <li>• Usuario: "apikey"</li>
                  <li>• Contraseña: Tu API Key de SendGrid</li>
                  <li>• Verifica tu dominio remitente</li>
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )

  function isConfigValid(): boolean {
    if (!config.enabled || !config.fromEmail) return false
    
    if (config.provider === 'resend') {
      return !!config.resendApiKey
    } else {
      return !!(config.host && config.user && config.password)
    }
  }
}