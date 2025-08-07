import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { google } from "googleapis"

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
  sourceSheet?: string // New field to store the source sheet name
}

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId } = await request.json() // Only need spreadsheetId now

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
    const sheets = google.sheets({ version: "v4", auth })

    // Get spreadsheet metadata to find all sheet names
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetNames = spreadsheetMetadata.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) as string[] || []

    if (sheetNames.length === 0) {
      return NextResponse.json({ message: "No sheets found in the specified spreadsheet" }, { status: 200 })
    }

    const batch = db.batch()
    let totalSuccessCount = 0
    let totalErrorCount = 0
    const allErrors: string[] = []
    const importedSheets: string[] = []

    for (const sheetName of sheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`, // Read all columns from the current sheet
        })

        const rows = response.data.values
        if (!rows || rows.length === 0) {
          console.log(`No data found in sheet: ${sheetName}`)
          continue
        }

        // Skip header row and process data by column position
        const licensesToImportFromSheet: IncomingLicenseData[] = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          
          // Expected column order: Software Name, Renewal Date, Amount, Currency, Responsible Email, Renewal URL, Status
          const software_name = row[0] ? String(row[0]).trim() : ""
          const renewal_date_raw = row[1]
          const ammount_raw = row[2]
          const currency = row[3] ? String(row[3]).trim() : "USD"
          const responsible_email = row[4] ? String(row[4]).trim() : ""
          const renewal_url = row[5] ? String(row[5]).trim() : ""
          const status = row[6] ? String(row[6]).trim() : "active"

          // Parse renewal date
          let renewal_date = ""
          if (renewal_date_raw) {
            try {
              const date = new Date(renewal_date_raw)
              if (!isNaN(date.getTime())) {
                renewal_date = date.toISOString()
              }
            } catch (dateError) {
              console.warn(`Error parsing date in sheet ${sheetName}, row ${i + 1}:`, renewal_date_raw)
            }
          }

          // Parse amount
          let ammount = 0
          if (ammount_raw) {
            const parsed = parseFloat(String(ammount_raw).replace(/[^0-9.-]/g, ''))
            if (!isNaN(parsed)) {
              ammount = parsed
            }
          }

          const mappedLicense: IncomingLicenseData = {
            software_name,
            renewal_date,
            ammount,
            currency,
            responsible_email,
            renewal_url,
            status,
            sourceSheet: sheetName, // Assign the source sheet name
          }

          if (mappedLicense.software_name && mappedLicense.renewal_date && mappedLicense.responsible_email && mappedLicense.ammount > 0) {
            licensesToImportFromSheet.push(mappedLicense)
          } else {
            console.warn(`Skipping invalid row in sheet ${sheetName}, row ${i + 1} due to missing required fields:`, row)
            allErrors.push(`Skipping invalid row in sheet ${sheetName}, row ${i + 1}: missing required fields.`)
            totalErrorCount++
          }
        }

        if (licensesToImportFromSheet.length > 0) {
          importedSheets.push(sheetName)
          for (const licenseData of licensesToImportFromSheet) {
            try {
              const renewalDate = new Date(licenseData.renewal_date)
              if (isNaN(renewalDate.getTime())) {
                throw new Error(`Invalid renewal date for ${licenseData.software_name}`)
              }

              const newLicenseRef = db.collection("licenses").doc()
              batch.set(newLicenseRef, {
                software_name: licenseData.software_name,
                renewal_date: renewalDate,
                ammount: parseFloat(licenseData.ammount.toString()),
                currency: licenseData.currency,
                responsible_email: licenseData.responsible_email,
                renewal_url: licenseData.renewal_url,
                status: licenseData.status || "active",
                sourceSheet: licenseData.sourceSheet, // Save the source sheet
                created_at: new Date(),
                updated_at: new Date(),
              })
              totalSuccessCount++
            } catch (e: any) {
              allErrors.push(`Error processing license ${licenseData.software_name} from sheet ${sheetName}: ${e.message}`)
              totalErrorCount++
            }
          }
        }
      } catch (e: any) {
        allErrors.push(`Error reading sheet ${sheetName}: ${e.message}`)
        totalErrorCount++
        console.error(`Error reading sheet ${sheetName}:`, e)
      }
    }

    await batch.commit()

    return NextResponse.json({
      message: "Licenses imported from Google Sheet(s) successfully",
      totalSuccessCount,
      totalErrorCount,
      importedSheets,
      errors: allErrors,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in /api/google-sheets/import:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
