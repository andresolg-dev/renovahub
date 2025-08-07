"use client"

import { useEffect, useState } from "react"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, startOfDay, endOfDay, addDays } from "date-fns" // Import startOfDay, endOfDay, addDays
import { ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLicenseUrgency, getUrgencyColors, getUrgencyLabel } from "@/lib/license-utils" // Import new utilities
import { Badge } from "@/components/ui/badge" // Import Badge

interface License {
  id: string
  software_name: string
  renewal_date: { toDate: () => Date }
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status: string
}

export default function UpcomingLicensesDashboard() {
  const [upcomingLicenses, setUpcomingLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const today = startOfDay(new Date())
    const thirtyDaysFromNow = endOfDay(addDays(today, 30))

    console.log("Querying licenses from:", today, "to:", thirtyDaysFromNow) // Debug: log query dates

    // Query licenses that are active and have a renewal date within the next 30 days
    const q = query(
      collection(db, "licenses"),
      where("status", "==", "active"),
      where("renewal_date", ">=", today),
      where("renewal_date", "<=", thirtyDaysFromNow),
      orderBy("renewal_date", "asc"),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Firestore snapshot received. Docs count:", snapshot.docs.length) // Debug: log snapshot count
        const licensesData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((license: any) => {
            const renewalDate = license.renewal_date?.toDate() // Safely access toDate
            if (!renewalDate) {
              console.warn("License missing or invalid renewal_date, skipping:", license.id, license.renewal_date)
              return false // Skip licenses without a valid renewal date
            }
            const urgency = getLicenseUrgency(renewalDate)
            return urgency === "red" || urgency === "yellow" || urgency === "expired"
          }) as License[]
        console.log("Filtered licenses for dashboard:", licensesData) // Debug: log filtered data
        setUpcomingLicenses(licensesData)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching upcoming licenses:", err)
        setError(`Error al cargar las licencias próximas a vencer: ${err.message}`) // More specific error message
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mb-6">
        <CardHeader>
          <CardTitle>Licencias Próximas a Vencer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-gray-500">Cargando licencias...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-6xl mb-6">
        <CardHeader>
          <CardTitle>Licencias Próximas a Vencer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-red-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-6xl mb-6">
      <CardHeader>
        <CardTitle>Licencias Próximas a Vencer ({upcomingLicenses.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingLicenses.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No hay licencias activas que venzan en los próximos 30 días. ¡Todo en orden!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingLicenses.map((license) => {
              const urgency = getLicenseUrgency(license.renewal_date.toDate())
              const { bgColor, textColor, borderColor } = getUrgencyColors(urgency)
              const label = getUrgencyLabel(urgency)

              return (
                <Card key={license.id} className={`p-4 border-l-4 ${borderColor || "border-gray-200"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{license.software_name}</h3>
                    <Badge className={`${bgColor} ${textColor}`}>{label}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vence el: {format(license.renewal_date.toDate(), "PPP")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Costo: {license.ammount} {license.currency}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Responsable: {license.responsible_email}</p>
                  {license.renewal_url && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 mt-2"
                      onClick={() => window.open(license.renewal_url, "_blank")}
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Ir a renovar
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
