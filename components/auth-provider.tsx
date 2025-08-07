"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore" // Import collection
import { Loader2 } from "lucide-react" // Import Loader2
import { useRouter } from "next/navigation" // Import useRouter
import type { User } from "firebase/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  role: string | null // Now stores the role name (e.g., "Administrator", "User")
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid)
        let userRoleName: string | null = null

        try {
          const userDocSnap = await getDoc(userDocRef)
          // Log the actual data if exists, for debugging purposes
          if (userDocSnap.exists()) {
            console.log("User document data:", JSON.stringify(userDocSnap.data()))
          } else {
            console.log("User document does not exist for UID:", currentUser.uid)
          }

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            if (userData.role_id) {
              try {
                const roleDocSnap = await getDoc(userData.role_id)
                if (roleDocSnap.exists()) {
                  userRoleName = (roleDocSnap.data().name as string) || "User"
                } else {
                  console.warn(`Role document for ID ${userData.role_id.id} not found. Defaulting to 'User'.`)
                  userRoleName = "User"
                }
              } catch (error) {
                console.error("Error fetching role document:", error)
                userRoleName = "User"
              }
            } else if (typeof userData.role === "string") {
              userRoleName = userData.role
            } else {
              userRoleName = "User"
            }
          } else {
            const defaultRoleRef = doc(db, "roles", "02")
            await setDoc(
              userDocRef,
              {
                email: currentUser.email,
                name: currentUser.displayName || currentUser.email,
                role_id: defaultRoleRef,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
              },
              { merge: true },
            )
            try {
              const defaultRoleSnap = await getDoc(defaultRoleRef)
              if (defaultRoleSnap.exists()) {
                userRoleName = (defaultRoleSnap.data().name as string) || "User"
              } else {
                console.warn(`Default role document for ID 02 not found. Defaulting to 'User'.`)
                userRoleName = "User"
              }
            } catch (error) {
              console.error("Error fetching default role document:", error)
              userRoleName = "User"
            }
          }
        } catch (error) {
          console.error("Error during user/role data fetching in AuthProvider:", error)
          userRoleName = "User" // Fallback in case of a broader error
        } finally {
          setRole(userRoleName)
          setLoading(false) // Ensure loading is set to false
        }
      } else {
        setRole(null)
        setLoading(false) // Ensure loading is set to false when no user
      }

      // Redirect logic
      if (!currentUser && window.location.pathname !== "/login") {
        router.push("/login")
      } else if (currentUser && window.location.pathname === "/login") {
        router.push("/")
      } else if (currentUser && window.location.pathname.startsWith("/admin") && role !== "Administrator") {
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router, role]) // Keep role in dependency array for redirection logic

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, loading, role }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
