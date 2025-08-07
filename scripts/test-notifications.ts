// Script para probar el sistema de notificaciones
// Ejecutar con: node scripts/test-notifications.js [tokens|notification|check]

const testEndpoint = async (endpoint: string, method = "GET", body?: any) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    console.log(`✅ ${method} ${endpoint}`)
    console.log("Status:", response.status)
    console.log("Response:", JSON.stringify(data, null, 2))
    console.log("---")

    return { success: response.ok, data }
  } catch (error) {
    console.error(`❌ ${method} ${endpoint}`)
    console.error("Error:", error)
    console.log("---")

    return { success: false, error }
  }
}

const runTests = async () => {
  const testType = process.argv[2] || "all"

  console.log("🧪 Iniciando pruebas del sistema de notificaciones...")
  console.log(`Tipo de prueba: ${testType}`)
  console.log("===")

  if (testType === "tokens" || testType === "all") {
    console.log("📊 Probando endpoint de estadísticas...")
    await testEndpoint("/api/notifications/stats")
  }

  if (testType === "notification" || testType === "all") {
    console.log("🔔 Probando notificación de prueba...")
    await testEndpoint("/api/notifications/send", "POST", {
      type: "test_notification",
      message: "Prueba desde script de línea de comandos",
    })
  }

  if (testType === "check" || testType === "all") {
    console.log("🔍 Probando verificación de licencias...")
    await testEndpoint("/api/notifications/send", "POST", {
      type: "license_check",
    })
  }

  console.log("✅ Pruebas completadas")
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTests().catch(console.error)
}

export { testEndpoint, runTests }
