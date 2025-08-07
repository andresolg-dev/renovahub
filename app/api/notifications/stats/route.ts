import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

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

export async function GET(request: NextRequest) {
  try {
    // Get all users with FCM tokens
    const usersQuery = await db.collection("users").get()

    let totalTokens = 0
    let usersWithTokens = 0
    let activeTokens = 0
    const tokensByUser: { [email: string]: number } = {}

    for (const userDoc of usersQuery.docs) {
      const userData = userDoc.data()
      const fcmTokens = userData.fcmTokens || []

      if (fcmTokens.length > 0) {
        usersWithTokens++
        totalTokens += fcmTokens.length
        activeTokens += fcmTokens.length // Assuming all tokens are active for now
        tokensByUser[userData.email] = fcmTokens.length
      }
    }

    // Get total licenses count
    const licensesQuery = await db.collection("licenses").where("status", "==", "active").get()
    const totalLicenses = licensesQuery.docs.length

    // Get licenses expiring in next 30 days
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const expiringLicensesQuery = await db
      .collection("licenses")
      .where("status", "==", "active")
      .where("renewal_date", "<=", thirtyDaysFromNow)
      .get()

    const expiringLicenses = expiringLicensesQuery.docs.length

    return NextResponse.json({
      fcmStats: {
        totalTokens,
        usersWithTokens,
        activeTokens,
        totalUsers: usersQuery.docs.length,
        tokensByUser,
      },
      licenseStats: {
        totalLicenses,
        expiringLicenses,
        healthyLicenses: totalLicenses - expiringLicenses,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error getting notification stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
