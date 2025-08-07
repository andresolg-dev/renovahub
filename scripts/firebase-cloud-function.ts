// Este archivo simula la lógica de una Firebase Cloud Function.
// Para un despliegue real, este código iría en un entorno de Cloud Functions
// (ej. en una carpeta 'functions' con su propio package.json y configuración de Firebase).

import { initializeApp, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"
import { pubsub } from "firebase-functions"
// import axios from 'axios'; // En un entorno real, necesitarías instalar y usar axios para llamadas HTTP

// Inicializa Firebase Admin SDK si no está ya inicializado
if (!getApps().length) {
  initializeApp()
}

const db = getFirestore()
const messaging = getMessaging()

interface IntegrationConfig {
  id: string
  type: "webhook" | "email" | "trello" | "slack"
  name: string
  enabled: boolean
  config: {
    url?: string // For webhooks, Slack
    emailRecipient?: string // For email
    trelloBoardId?: string // For Trello
    trelloListId?: string // For Trello
    slackChannel?: string // For Slack (optional, if not using webhook URL)
    messageTemplate?: string // Custom message template
    // Add more specific fields as needed for each integration
  }
}

/**
 * Helper function to replace template variables in a string.
 */
function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  let result = template
  for (const key in data) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(data[key]))
  }
  return result
}

/**
 * Cloud Function que se ejecuta diariamente para chequear licencias próximas a vencer.
 * Simula el envío de notificaciones push y a otras integraciones.
 */
export const checkLicenseRenewals = pubsub.schedule("every 24 hours").onRun(async (context) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalizar a inicio del día

  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  console.log("--- Iniciando chequeo de renovaciones (simulado) ---")
  console.log(`Fecha actual: ${today.toISOString().split("T")[0]}`)

  try {
    // 1. Obtener configuraciones de integraciones activas
    const integrationsSnapshot = await db.collection("integrations").where("enabled", "==", true).get()
    const enabledIntegrations: IntegrationConfig[] = integrationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IntegrationConfig[]

    console.log(`Integraciones activas encontradas: ${enabledIntegrations.length}`)
    enabledIntegrations.forEach((int) => console.log(`- ${int.name} (${int.type})`))

    // 2. Consulta licencias activas que vencen en los próximos 30 días o ya vencieron hoy
    const licensesSnapshot = await db
      .collection("licenses")
      .where("status", "==", "active")
      .where("renewal_date", "<=", thirtyDaysFromNow)
      .orderBy("renewal_date", "asc")
      .get()

    if (licensesSnapshot.empty) {
      console.log("No hay licencias próximas a vencer en los próximos 30 días.")
      return null
    }

    const notificationsToLog: { recipient: string; title: string; body: string; type: string }[] = []

    for (const doc of licensesSnapshot.docs) {
      const license = doc.data()
      const renewalDate = license.renewal_date.toDate() // Convertir Timestamp a Date

      // Calcular días hasta la renovación
      const diffTime = renewalDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let notificationTitle = ""
      let notificationBody = ""
      let notificationType = ""

      if (diffDays === 30) {
        notificationTitle = `¡Recordatorio! Licencia de ${license.software_name}`
        notificationBody = `Tu licencia de ${license.software_name} vence en 30 días.`
        notificationType = "30_DAYS_REMINDER"
      } else if (diffDays === 7) {
        notificationTitle = `¡Alerta! Licencia de ${license.software_name}`
        notificationBody = `Tu licencia de ${license.software_name} vence en 7 días. ¡Acción requerida!`
        notificationType = "7_DAYS_REMINDER"
      } else if (diffDays === 1) {
        notificationTitle = `¡URGENTE! Licencia de ${license.software_name}`
        notificationBody = `Tu licencia de ${license.software_name} vence MAÑANA.`
        notificationType = "1_DAY_REMINDER"
      } else if (diffDays <= 0) {
        // Incluye hoy y fechas pasadas
        notificationTitle = `¡ATENCIÓN! Licencia de ${license.software_name} VENCIDA`
        notificationBody = `Tu licencia de ${license.software_name} ha vencido. Por favor, renueva lo antes posible.`
        notificationType = "EXPIRED_REMINDER"
      } else {
        continue // No enviar notificación para este umbral
      }

      // Datos para la plantilla de mensaje
      const templateData = {
        software_name: license.software_name,
        renewal_date: renewalDate.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }),
        amount: license.ammount,
        currency: license.currency,
        responsible_email: license.responsible_email,
        renewal_url: license.renewal_url,
      }

      // 3. Enviar notificaciones a través de FCM (existente)
      const usersSnapshot = await db.collection("users").where("email", "==", license.responsible_email).limit(1).get()

      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data()
        const fcmTokens = userData.fcmTokens || []

        if (fcmTokens.length > 0) {
          console.log(
            `Simulando envío de notificación FCM para ${license.software_name} a ${license.responsible_email}:`,
          )
          console.log(`  Título: ${notificationTitle}`)
          console.log(`  Cuerpo: ${notificationBody}`)
          console.log(`  Tokens FCM encontrados: ${fcmTokens.length}`)
          // En un entorno real, aquí se usaría admin.messaging().send()
          notificationsToLog.push({
            recipient: license.responsible_email,
            title: notificationTitle,
            body: notificationBody,
            type: notificationType,
          })
        } else {
          console.log(`No se encontraron tokens FCM para ${license.responsible_email}.`)
        }
      } else {
        console.log(`Usuario responsable ${license.responsible_email} no encontrado en Firestore.`)
      }

      // 4. Enviar notificaciones a otras integraciones (nuevo)
      for (const integration of enabledIntegrations) {
        const message = replaceTemplateVariables(integration.config.messageTemplate || "", templateData)

        switch (integration.type) {
          case "slack":
            if (integration.config.url) {
              console.log(`[SIMULACIÓN SLACK] Enviando a ${integration.name} (${integration.config.url}): ${message}`)
              // En un entorno real:
              // await axios.post(integration.config.url, { text: message });
            } else {
              console.warn(
                `[SLACK] Integración '${integration.name}' habilitada pero sin URL de webhook. Se omite el envío.`,
              )
            }
            break
          case "email":
            if (integration.config.emailRecipient) {
              console.log(
                `[SIMULACIÓN EMAIL] Enviando a ${integration.name} (${integration.config.emailRecipient}): Asunto: ${notificationTitle}, Cuerpo: ${message}`,
              )
              // En un entorno real:
              // const sgMail = require('@sendgrid/mail');
              // sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Asegúrate de tener esta variable de entorno
              // await sgMail.send({
              //   to: integration.config.emailRecipient,
              //   from: 'no-reply@renovahub.com', // Tu email verificado
              //   subject: notificationTitle,
              //   html: message,
              // });
            } else {
              console.warn(
                `[EMAIL] Integración '${integration.name}' habilitada pero sin destinatario. Se omite el envío.`,
              )
            }
            break
          case "trello":
            if (integration.config.trelloBoardId && integration.config.trelloListId) {
              console.log(
                `[SIMULACIÓN TRELLO] Creando tarjeta en ${integration.name} (Tablero: ${integration.config.trelloBoardId}, Lista: ${integration.config.trelloListId}): Nombre: ${message}, Descripción: ${license.renewal_url}`,
              )
              // En un entorno real:
              // const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
              // const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
              // await axios.post(`https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`, {
              //   idList: integration.config.trelloListId,
              //   name: message,
              //   desc: `Software: ${license.software_name}\nResponsable: ${license.responsible_email}\nURL: ${license.renewal_url || 'N/A'}`,
              //   // Puedes añadir idMembers si mapeas emails a IDs de miembros de Trello
              // });
            } else {
              console.warn(
                `[TRELLO] Integración '${integration.name}' habilitada pero faltan IDs de tablero/lista. Se omite la creación de tarjeta.`,
              )
            }
            break
          // Añade más casos para otros tipos de integración aquí
          default:
            console.warn(`Tipo de integración desconocido: ${integration.type}. Se omite el envío.`)
        }
      }
    }

    console.log("--- Chequeo de renovaciones simulado completado ---")
    console.log("Resumen de notificaciones FCM simuladas:", notificationsToLog)
    return null
  } catch (error: any) {
    console.error("Error en la Cloud Function simulada checkLicenseRenewals:", error)
    return null
  }
})
