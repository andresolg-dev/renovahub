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

export async function DELETE(request: NextRequest, { params }: { params: { uid: string } }) {
  const { uid } = params

  if (!uid) {
    return NextResponse.json({ error: "User UID is required" }, { status: 400 })
  }

  try {
    // 1. Delete user from Firebase Authentication
    await authAdmin.deleteUser(uid)
    console.log(`Successfully deleted user from Auth: ${uid}`)

    // 2. Delete user profile from Firestore
    await db.collection("users").doc(uid).delete()
    console.log(`Successfully deleted user from Firestore: ${uid}`)

    return NextResponse.json({ message: `User ${uid} deleted successfully` }, { status: 200 })
  } catch (error: any) {
    console.error(`Error deleting user ${uid}:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
