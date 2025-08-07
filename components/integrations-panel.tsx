"use client"
import { useEffect, useState } from "react"
import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from 'lucide-react'

interface IntegrationConfig {
  id: string
  type: "webhook" | "email" | "trello" | "slack" | "google_sheets" // Added google_sheets
  name: string
  enabled: boolean
  config: {
    url?: string // For webhooks, Slack
    emailRecipient?: string // For email
    trelloBoardId?: string // For Trello
    trelloListId?: string // For Trello
    slackChannel?: string // For Slack (optional, if not using webhook URL)
    messageTemplate?: string // Custom message template
    spreadsheetId?: string // For Google Sheets
    sheetName?: string // For Google Sheets
    // Add more specific fields as needed for each integration
  }
  created_at?: { toDate: () => Date }
  updated_at?: { toDate: () => Date }
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchIntegrations = async () => {
      setLoading(true)
      try {
        const integrationsCollection = collection(db, "integrations")
        const snapshot = await getDocs(integrationsCollection)
        const fetchedIntegrations: IntegrationConfig[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as IntegrationConfig[]

        const defaultIntegrations: IntegrationConfig[] = [
          {
            id: "slack_webhook",
            type: "slack",
            name: "Notificaciones Slack (Webhook)",
            enabled: false,
            config: { url: "", messageTemplate: "La licencia de {{software_name}} vence el {{renewal_date}}." },
          },
          {
            id: "email_notifications",
            type: "email",
            name: "Notificaciones por Correo Electrónico",
            enabled: false,
            config: {
              emailRecipient: "",
              messageTemplate: "La licencia de {{software_name}} vence el {{renewal_date}}.",
            },
          },
          {
            id: "trello_cards",
            type: "trello",
            name: "Crear Tarjetas Trello",
            enabled: false,
            config: {
              trelloBoardId: "",
              trelloListId: "",
              messageTemplate: "Renovar {{software_name}} ({{renewal_date}})",
            },
          },
          { // New Google Sheets Integration
            id: "google_sheets_sync",
            type: "google_sheets",
            name: "Sincronización Google Sheets",
            enabled: false,
            config: {
              spreadsheetId: "",
              sheetName: "Licencias", // Default sheet name
            },
          },
        ]

        const mergedIntegrations = defaultIntegrations.map((defaultInt) => {
          const existing = fetchedIntegrations.find((fi) => fi.id === defaultInt.id)
          return existing ? { ...defaultInt, ...existing } : defaultInt
        })

        setIntegrations(mergedIntegrations)
      } catch (error: any) {
        toast({
          title: "Error al cargar integraciones",
          description: error.message,
          variant: "destructive",
        })
        console.error("Error fetching integrations:", error)
      } finally {
        setLoading(false) // Asegura que el estado de carga se desactive
      }
    }
    fetchIntegrations()
  }, [toast])

  const handleInputChange = (id: string, field: string, value: any) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id ? { ...integration, config: { ...integration.config, [field]: value } } : integration,
      ),
    )
  }

  const handleToggleChange = (id: string, checked: boolean) => {
    setIntegrations((prev) =>
      prev.map((integration) => (integration.id === id ? { ...integration, enabled: checked } : integration)),
    )
  }

  const handleSave = async (integration: IntegrationConfig) => {
    setLoading(true)
    try {
      const integrationRef = doc(db, "integrations", integration.id)
      await setDoc(
        integrationRef,
        {
          ...integration,
          updated_at: serverTimestamp(),
          created_at: integration.created_at || serverTimestamp(), // Preserve created_at if exists
        },
        { merge: true },
      )
      toast({
        title: "Integración guardada",
        description: `La configuración de "${integration.name}" ha sido actualizada.`,
      })
    } catch (error: any) {
      toast({
        title: "Error al guardar integración",
        description: error.message,
        variant: "destructive",
      })
      console.error("Error saving integration:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Gestión de Integraciones</h1>
      <p className="text-muted-foreground mb-8">
        Configura las integraciones para automatizar las notificaciones de renovación de licencias con tus herramientas
        favoritas.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{integration.name}</CardTitle>
              <Switch
                checked={integration.enabled}
                onCheckedChange={(checked) => handleToggleChange(integration.id, checked)}
              />
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="mb-4">
                {integration.type === "slack" && "Envía notificaciones a un canal de Slack mediante un Webhook URL."}
                {integration.type === "email" && "Envía correos electrónicos a una dirección específica."}
                {integration.type === "trello" && "Crea tarjetas en un tablero y lista de Trello."}
                {integration.type === "google_sheets" && "Sincroniza licencias con una hoja de cálculo de Google Sheets. Requiere configuración de credenciales de servicio en el servidor."}
                {integration.type === "webhook" && "Envía datos a un Webhook URL genérico."}
              </CardDescription>
              <div className="grid gap-4">
                {integration.type === "slack" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor={`${integration.id}-url`}>Webhook URL de Slack</Label>
                      <Input
                        id={`${integration.id}-url`}
                        value={integration.config.url || ""}
                        onChange={(e) => handleInputChange(integration.id, "url", e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                  </>
                )}
                {integration.type === "email" && (
                  <div className="grid gap-2">
                    <Label htmlFor={`${integration.id}-recipient`}>Correo del Destinatario</Label>
                    <Input
                      id={`${integration.id}-recipient`}
                      type="email"
                      value={integration.config.emailRecipient || ""}
                      onChange={(e) => handleInputChange(integration.id, "emailRecipient", e.target.value)}
                      placeholder="equipo@ejemplo.com"
                    />
                  </div>
                )}
                {integration.type === "trello" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor={`${integration.id}-board`}>ID del Tablero de Trello</Label>
                      <Input
                        id={`${integration.id}-board`}
                        value={integration.config.trelloBoardId || ""}
                        onChange={(e) => handleInputChange(integration.id, "trelloBoardId", e.target.value)}
                        placeholder="Ej: 60c7e0f3a1b2c3d4e5f6a7b8"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${integration.id}-list`}>ID de la Lista de Trello</Label>
                      <Input
                        id={`${integration.id}-list`}
                        value={integration.config.trelloListId || ""}
                        onChange={(e) => handleInputChange(integration.id, "trelloListId", e.target.value)}
                        placeholder="Ej: 60c7e0f3a1b2c3d4e5f6a7b9"
                      />
                    </div>
                  </>
                )}
                {integration.type === "google_sheets" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor={`${integration.id}-spreadsheetId`}>ID de la Hoja de Cálculo</Label>
                      <Input
                        id={`${integration.id}-spreadsheetId`}
                        value={integration.config.spreadsheetId || ""}
                        onChange={(e) => handleInputChange(integration.id, "spreadsheetId", e.target.value)}
                        placeholder="ID de tu Google Sheet (de la URL)"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${integration.id}-sheetName`}>Nombre de la Pestaña</Label>
                      <Input
                        id={`${integration.id}-sheetName`}
                        value={integration.config.sheetName || ""}
                        onChange={(e) => handleInputChange(integration.id, "sheetName", e.target.value)}
                        placeholder="Ej: Licencias Activas"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asegúrate de que la cuenta de servicio de Google (configurada en tus variables de entorno del servidor) tenga permisos de edición en esta hoja de cálculo.
                    </p>
                  </>
                )}
                {/* Common message template for Slack, Email, Trello */}
                {(integration.type === "slack" || integration.type === "email" || integration.type === "trello") && (
                  <div className="grid gap-2">
                    <Label htmlFor={`${integration.id}-template`}>Plantilla de Mensaje</Label>
                    <Textarea
                      id={`${integration.id}-template`}
                      value={integration.config.messageTemplate || ""}
                      onChange={(e) => handleInputChange(integration.id, "messageTemplate", e.target.value)}
                      placeholder="La licencia de {{software_name}} vence el {{renewal_date}}."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables disponibles: `{"{{software_name}}"}`, `{"{{renewal_date}}"}`, `{"{{amount}}"}`, `
                      {"{{currency}}"}`, `{"{{responsible_email}}"}`, `{"{{renewal_url}}"}`.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button onClick={() => handleSave(integration)} className="w-full">
                Guardar Configuración
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
