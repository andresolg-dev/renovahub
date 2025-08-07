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
}

export async function GET() {
  try {
    const configDoc = await db.collection("config").doc("email").get()
    
    if (!configDoc.exists) {
      // Return default config
      const defaultConfig: EmailConfig = {
        enabled: false,
        provider: 'resend',
        resendApiKey: '',
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        fromName: 'RenovaHub',
        fromEmail: ''
      }
      
      return NextResponse.json({ config: defaultConfig })
    }

    const config = configDoc.data() as EmailConfig
    
    // Don't return sensitive data for security
    const safeConfig = {
      ...config,
      resendApiKey: config.resendApiKey ? "••••••••••••••••••••••••••••••" : "",
      password: config.password ? "••••••••" : ""
    }

    return NextResponse.json({ config: safeConfig })
  } catch (error: any) {
    console.error("Error fetching email config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config }: { config: EmailConfig } = await request.json()

    if (!config) {
      return NextResponse.json({ error: "Configuration is required" }, { status: 400 })
    }

    // Validate required fields if enabled
    if (config.enabled) {
      if (!config.fromEmail) {
        return NextResponse.json({ 
          error: "fromEmail is required when email service is enabled" 
        }, { status: 400 })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(config.fromEmail)) {
        return NextResponse.json({ 
          error: "Invalid fromEmail format" 
        }, { status: 400 })
      }

      // Validate provider-specific requirements
      if (config.provider === 'resend') {
        if (!config.resendApiKey) {
          return NextResponse.json({ 
            error: "Resend API Key is required when using Resend" 
          }, { status: 400 })
        }
      } else if (config.provider === 'smtp') {
        if (!config.host || !config.user || !config.password) {
          return NextResponse.json({ 
            error: "Host, user, and password are required when using SMTP" 
          }, { status: 400 })
        }

        if (!config.user) {
          return NextResponse.json({ 
            error: "Invalid user email format" 
          }, { status: 400 })
        }
      }
    }

    // Get existing config to preserve sensitive data if not changed
    const existingDoc = await db.collection("config").doc("email").get()
    let finalConfig = { ...config }

    if (existingDoc.exists) {
      const existingConfig = existingDoc.data() as EmailConfig
      
      // Preserve API key if not changed
      if (config.resendApiKey === "••••••••••••••••••••••••••••••") {
        finalConfig.resendApiKey = existingConfig.resendApiKey
      }
      
      // Preserve password if not changed
      if (config.password === "••••••••") {
        finalConfig.password = existingConfig.password
      }
    }

    // Save to Firestore
    await db.collection("config").doc("email").set({
      ...finalConfig,
      updatedAt: new Date(),
    })

    return NextResponse.json({ 
      message: "Email configuration saved successfully",
      success: true 
    })
  } catch (error: any) {
    console.error("Error saving email config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}