"use client"

import { useEffect } from "react"
import { getToken } from "firebase/messaging"
import { doc, updateDoc, arrayUnion } from "firebase/firestore"
import { messaging, db, auth } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { onAuthStateChanged } from "firebase/auth"

export default function NotificationHandler() {
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && messaging) {
        requestPermissionAndSaveToken(user.uid)
      } else if (!user && messaging) {
        // If user logs out, consider removing their token from Firestore
        // This is more complex as you'd need the old token, but good practice for production
        console.log("User logged out, consider removing FCM token.")
      }
    })

    return () => unsubscribeAuth()
  }, [])

  const requestPermissionAndSaveToken = async (uid: string) => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !messaging) {
      console.warn("Notifications or Service Worker not supported, or Firebase Messaging not initialized.")
      return
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      console.log("Service Worker registered:", registration)

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        console.log("Notification permission granted.")

        // Get FCM token
        // Use environment variable for VAPID key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ""
        if (!vapidKey) {
          console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set. FCM token cannot be generated.")
          toast({
            title: "Error de notificación",
            description: "La clave VAPID no está configurada. Las notificaciones push no funcionarán.",
            variant: "destructive",
          })
          return
        }

        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration,
        })

        if (currentToken) {
          console.log("FCM Token:", currentToken)
          // Save token to Firestore for the current user
          const userRef = doc(db, "users", uid)
          await updateDoc(
            userRef,
            {
              fcmTokens: arrayUnion(currentToken),
            },
            { merge: true },
          ) // Use merge: true to add to existing array or create if not exists
          toast({
            title: "Notificaciones habilitadas",
            description: "Recibirás alertas de renovación.",
          })
        } else {
          console.log("No registration token available. Request permission to generate one.")
          toast({
            title: "Error de notificación",
            description: "No se pudo obtener el token de notificación. Asegúrate de permitir las notificaciones.",
            variant: "destructive",
          })
        }
      } else {
        console.warn("Notification permission denied.")
        toast({
          title: "Permiso de notificación denegado",
          description: "No podrás recibir alertas de renovación.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error getting FCM token or saving to Firestore:", error)
      toast({
        title: "Error de notificación",
        description: `Hubo un problema al configurar las notificaciones: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  return null // This component doesn't render anything visible
}
