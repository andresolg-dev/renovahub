import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as XLSX from "xlsx" // Import xlsx library for server-side

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
    const licensesSnapshot = await db.collection("licenses").orderBy("software_name", "asc").get()
    const licensesData = licensesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        "ID": doc.id,
        "Software Name": data.software_name,
        "Renewal Date": data.renewal_date ? data.renewal_date.toDate().toLocaleDateString("es-ES") : "",
        "Amount": data.ammount,
        "Currency": data.currency,
        "Responsible Email": data.responsible_email,
        "Renewal URL": data.renewal_url,
        "Status": data.status,
        "Created At": data.created_at ? data.created_at.toDate().toLocaleString("es-ES") : "",
        "Updated At": data.updated_at ? data.updated_at.toDate().toLocaleString("es-ES") : "",
      }
    })

    if (licensesData.length === 0) {
      return NextResponse.json({ message: "No licenses to export" }, { status: 204 })
    }

    const worksheet = XLSX.utils.json_to_sheet(licensesData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Licenses")

    // Generate XLSX buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    const headers = new Headers()
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    headers.set("Content-Disposition", `attachment; filename="renovahub_licenses_${new Date().toISOString().split('T')[0]}.xlsx"`)

    return new NextResponse(excelBuffer, { headers })

  } catch (error: any) {
    console.error("Error in /api/licenses/export:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
