import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { google } from "googleapis" // Import googleapis

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

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, sheetName } = await request.json()

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json({ error: "Spreadsheet ID and Sheet Name are required" }, { status: 400 })
    }

    // --- Google Sheets API Authentication (Server-side) ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
    const sheets = google.sheets({ version: "v4", auth })
    // --- End Google Sheets API Authentication ---

    // Fetch licenses from Firestore
    const licensesSnapshot = await db.collection("licenses").orderBy("software_name", "asc").get()
    const licensesData = licensesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return [
        doc.id,
        data.software_name,
        data.renewal_date ? data.renewal_date.toDate().toLocaleDateString("es-ES") : "",
        data.ammount,
        data.currency,
        data.responsible_email,
        data.renewal_url,
        data.status,
        data.created_at ? data.created_at.toDate().toLocaleString("es-ES") : "",
        data.updated_at ? data.updated_at.toDate().toLocaleString("es-ES") : "",
      ]
    })

    if (licensesData.length === 0) {
      return NextResponse.json({ message: "No licenses to export" }, { status: 200 })
    }

    // Prepare headers
    const headers = [
      "ID",
      "Software Name",
      "Renewal Date",
      "Amount",
      "Currency",
      "Responsible Email",
      "Renewal URL",
      "Status",
      "Created At",
      "Updated At",
    ]

    const values = [headers, ...licensesData]

    // Write data to Google Sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`, // Start writing from A1
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    })

    return NextResponse.json({ message: "Licenses exported to Google Sheet successfully" }, { status: 200 })

  } catch (error: any) {
    console.error("Error in /api/google-sheets/export:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
