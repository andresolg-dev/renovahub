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

interface IncomingLicenseData {
  software_name: string
  renewal_date: string // ISO string
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: { licenses: IncomingLicenseData[] } = await request.json()
    const licensesToImport = body.licenses

    if (!licensesToImport || !Array.isArray(licensesToImport) || licensesToImport.length === 0) {
      return NextResponse.json({ error: "No licenses data provided" }, { status: 400 })
    }

    const batch = db.batch()
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const licenseData of licensesToImport) {
      // Basic validation
      if (!licenseData.software_name || !licenseData.renewal_date || !licenseData.responsible_email) {
        errors.push(`Skipping invalid license: missing required fields for ${licenseData.software_name || 'unknown'}`)
        errorCount++
        continue
      }

      try {
        const renewalDate = new Date(licenseData.renewal_date)
        if (isNaN(renewalDate.getTime())) {
          throw new Error(`Invalid renewal date for ${licenseData.software_name}`)
        }

        const newLicenseRef = db.collection("licenses").doc()
        batch.set(newLicenseRef, {
          software_name: licenseData.software_name,
          renewal_date: renewalDate, // Store as Firestore Timestamp
          ammount: parseFloat(licenseData.ammount.toString()), // Ensure it's a number
          currency: licenseData.currency,
          responsible_email: licenseData.responsible_email,
          renewal_url: licenseData.renewal_url,
          status: licenseData.status || "active",
          created_at: new Date(), // Use server-side timestamp
          updated_at: new Date(), // Use server-side timestamp
        })
        successCount++
      } catch (e: any) {
        errors.push(`Error processing license ${licenseData.software_name}: ${e.message}`)
        errorCount++
      }
    }

    await batch.commit()

    return NextResponse.json({
      message: "Licenses imported successfully",
      successCount,
      errorCount,
      errors,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in /api/licenses/import:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
