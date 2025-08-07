// Give the service worker access to Firebase SDK.
// This is a global script, so it doesn't need to be imported.
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js")

// Declare the firebase variable
const firebase = self.firebase

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyCxV9tE40bZlziYEU5AgGmBJRubAPnKDLY",
  authDomain: "sincrolicencias.firebaseapp.com",
  projectId: "sincrolicencias",
  storageBucket: "sincrolicencias.firebasestorage.app",
  messagingSenderId: "984119162142",
  appId: "1:984119162142:web:5fece395e58cdd0e8b050f",
  measurementId: "G-N4DFJ7E08C",
}

firebase.initializeApp(firebaseConfig)

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload)
  // Customize notification here
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/placeholder.svg?height=192&width=192", // Use your PWA icon
    data: payload.data, // Custom data
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Optional: Handle notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data?.url || "/" // Default to root
  event.waitUntil(clients.openWindow(urlToOpen))
})
