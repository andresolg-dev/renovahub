import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
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

const authAdmin = getAuth()
const db = getFirestore()

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, roleId } = await request.json()

    if (!email || !password || !name || !roleId) {
      return NextResponse.json({ 
        error: "Email, password, name, and roleId are required" 
      }, { status: 400 })
    }

    // 1. Create user in Firebase Auth using Admin SDK
    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: name,
    })

    // 2. Create a reference to the role document
    const roleRef = db.collection("roles").doc(roleId)

    // 3. Add user profile to Firestore
    await db.collection("users").doc(userRecord.uid).set({
      email,
      name,
      role_id: roleRef,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      uid: userRecord.uid
    })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json({ 
      error: error.message || "Error creating user" 
    }, { status: 500 })
  }
}