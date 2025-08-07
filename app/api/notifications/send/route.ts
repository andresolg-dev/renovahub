import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"
import { differenceInDays, format } from "date-fns"

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  })
}

const db = getFirestore()
const messaging = getMessaging()

interface NotificationRequest {
  type: "license_created" | "license_updated" | "license_check" | "test_notification"
  licenseId?: string
  userId?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationRequest = await request.json()

    switch (body.type) {
      case "license_created":
        return await handleLicenseCreated(body.licenseId!)
      case "license_updated":
        return await handleLicenseUpdated(body.licenseId!)
      case "license_check":
        return await handleLicenseCheck()
      case "test_notification":
        return await handleTestNotification(body.userId, body.message)
      default:
        return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleLicenseCreated(licenseId: string) {
  const licenseDoc = await db.collection("licenses").doc(licenseId).get()
  if (!licenseDoc.exists) {
    throw new Error("License not found")
  }

  const license = licenseDoc.data()!
  const responsibleEmail = license.responsible_email

  // Find responsible user
  const userQuery = await db.collection("users").where("email", "==", responsibleEmail).limit(1).get()
  if (userQuery.empty) {
    throw new Error("Responsible user not found")
  }

  const userData = userQuery.docs[0].data()
  const fcmTokens = userData.fcmTokens || []

  if (fcmTokens.length === 0) {
    return NextResponse.json({ message: "No FCM tokens available for user" })
  }

  // Send notification to responsible user
  const message = {
    notification: {
      title: "🆕 Nueva Licencia Asignada",
      body: `Se te ha asignado la licencia de ${license.software_name}. Vence el ${format(license.renewal_date.toDate(), "dd/MM/yyyy")}.`,
    },
    data: {
      type: "license_assigned",
      licenseId: licenseId,
      software_name: license.software_name,
    },
    tokens: fcmTokens,
  }

  const response = await messaging.sendEachForMulticast(message)

  // Also check if license is expiring soon
  await checkLicenseExpiration(licenseId, license)

  return NextResponse.json({
    message: "License creation notification sent",
    successCount: response.successCount,
    failureCount: response.failureCount,
  })
}

async function handleLicenseUpdated(licenseId: string) {
  const licenseDoc = await db.collection("licenses").doc(licenseId).get()
  if (!licenseDoc.exists) {
    throw new Error("License not found")
  }

  const license = licenseDoc.data()!
  const responsibleEmail = license.responsible_email

  // Find responsible user
  const userQuery = await db.collection("users").where("email", "==", responsibleEmail).limit(1).get()
  if (userQuery.empty) {
    throw new Error("Responsible user not found")
  }

  const userData = userQuery.docs[0].data()
  const fcmTokens = userData.fcmTokens || []

  if (fcmTokens.length === 0) {
    return NextResponse.json({ message: "No FCM tokens available for user" })
  }

  // Send notification to responsible user
  const message = {
    notification: {
      title: "📝 Licencia Actualizada",
      body: `La licencia de ${license.software_name} ha sido actualizada. Nueva fecha de vencimiento: ${format(license.renewal_date.toDate(), "dd/MM/yyyy")}.`,
    },
    data: {
      type: "license_updated",
      licenseId: licenseId,
      software_name: license.software_name,
    },
    tokens: fcmTokens,
  }

  const response = await messaging.sendEachForMulticast(message)

  // Also check if license is expiring soon
  await checkLicenseExpiration(licenseId, license)

  return NextResponse.json({
    message: "License update notification sent",
    successCount: response.successCount,
    failureCount: response.failureCount,
  })
}

async function handleLicenseCheck() {
  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  // Get all active licenses
  const licensesQuery = await db
    .collection("licenses")
    .where("status", "==", "active")
    .where("renewal_date", "<=", thirtyDaysFromNow)
    .get()

  let totalNotifications = 0
  const results = []

  for (const licenseDoc of licensesQuery.docs) {
    const license = licenseDoc.data()
    const result = await checkLicenseExpiration(licenseDoc.id, license)
    if (result.sent) {
      totalNotifications += result.count
    }
    results.push(result)
  }

  return NextResponse.json({
    message: "License check completed",
    totalLicensesChecked: licensesQuery.docs.length,
    totalNotificationsSent: totalNotifications,
    results,
  })
}

async function checkLicenseExpiration(licenseId: string, license: any) {
  const today = new Date()
  const renewalDate = license.renewal_date.toDate()
  const daysUntilRenewal = differenceInDays(renewalDate, today)

  let shouldNotify = false
  let notificationTitle = ""
  let notificationBody = ""
  let urgencyLevel = ""

  // Determine if we should send notification based on days until renewal
  if (daysUntilRenewal === 30) {
    shouldNotify = true
    notificationTitle = "📅 Licencia por Vencer en 30 días"
    notificationBody = `La licencia de ${license.software_name} vence el ${format(renewalDate, "dd/MM/yyyy")}. Planifica su renovación.`
    urgencyLevel = "info"
  } else if (daysUntilRenewal === 15) {
    shouldNotify = true
    notificationTitle = "⚠️ Licencia por Vencer en 15 días"
    notificationBody = `La licencia de ${license.software_name} vence el ${format(renewalDate, "dd/MM/yyyy")}. Es momento de renovar.`
    urgencyLevel = "warning"
  } else if (daysUntilRenewal === 7) {
    shouldNotify = true
    notificationTitle = "🚨 Licencia por Vencer en 7 días"
    notificationBody = `¡URGENTE! La licencia de ${license.software_name} vence el ${format(renewalDate, "dd/MM/yyyy")}.`
    urgencyLevel = "urgent"
  } else if (daysUntilRenewal === 1) {
    shouldNotify = true
    notificationTitle = "🔥 Licencia Vence Mañana"
    notificationBody = `¡CRÍTICO! La licencia de ${license.software_name} vence MAÑANA (${format(renewalDate, "dd/MM/yyyy")}).`
    urgencyLevel = "critical"
  } else if (daysUntilRenewal <= 0) {
    shouldNotify = true
    notificationTitle = "💀 Licencia Vencida"
    notificationBody = `La licencia de ${license.software_name} ha VENCIDO. Renueva inmediatamente para evitar interrupciones.`
    urgencyLevel = "expired"
  }

  if (!shouldNotify) {
    return { sent: false, licenseId, software_name: license.software_name, daysUntilRenewal }
  }

  // Find responsible user
  const userQuery = await db.collection("users").where("email", "==", license.responsible_email).limit(1).get()
  if (userQuery.empty) {
    return { sent: false, error: "Responsible user not found", licenseId, software_name: license.software_name }
  }

  const userData = userQuery.docs[0].data()
  const fcmTokens = userData.fcmTokens || []

  if (fcmTokens.length === 0) {
    return { sent: false, error: "No FCM tokens available", licenseId, software_name: license.software_name }
  }

  // Send notification
  const message = {
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    data: {
      type: "license_expiring",
      licenseId: licenseId,
      software_name: license.software_name,
      urgency: urgencyLevel,
      renewal_url: license.renewal_url || "",
      days_until_renewal: daysUntilRenewal.toString(),
    },
    tokens: fcmTokens,
  }

  const response = await messaging.sendEachForMulticast(message)

  return {
    sent: true,
    licenseId,
    software_name: license.software_name,
    daysUntilRenewal,
    urgencyLevel,
    count: response.successCount,
    failures: response.failureCount,
  }
}

async function handleTestNotification(userId?: string, customMessage?: string) {
  let fcmTokens: string[] = []

  if (userId) {
    // Send to specific user
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      throw new Error("User not found")
    }
    fcmTokens = userDoc.data()?.fcmTokens || []
  } else {
    // Send to all users with tokens
    const usersQuery = await db.collection("users").where("fcmTokens", "!=", null).get()
    for (const userDoc of usersQuery.docs) {
      const userTokens = userDoc.data().fcmTokens || []
      fcmTokens.push(...userTokens)
    }
  }

  if (fcmTokens.length === 0) {
    return NextResponse.json({ message: "No FCM tokens available" })
  }

  const message = {
    notification: {
      title: "🧪 Notificación de Prueba - RenovaHub",
      body: customMessage || "Esta es una notificación de prueba del sistema. ¡Todo funciona correctamente!",
    },
    data: {
      type: "test_notification",
      timestamp: new Date().toISOString(),
    },
    tokens: fcmTokens,
  }

  const response = await messaging.sendEachForMulticast(message)

  return NextResponse.json({
    message: "Test notification sent",
    successCount: response.successCount,
    failureCount: response.failureCount,
    totalTokens: fcmTokens.length,
  })
}
