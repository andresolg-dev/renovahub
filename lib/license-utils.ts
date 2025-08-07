import { differenceInDays, isPast } from "date-fns"

export type UrgencyStatus = "red" | "yellow" | "green" | "expired"

export function getLicenseUrgency(renewalDate: Date): UrgencyStatus {
  const today = new Date()
  const daysUntilRenewal = differenceInDays(renewalDate, today)

  if (isPast(renewalDate) && renewalDate.toDateString() !== today.toDateString()) {
    return "expired" // Already expired
  } else if (daysUntilRenewal <= 7) {
    return "red" // Expires in 7 days or less (or today)
  } else if (daysUntilRenewal <= 30) {
    return "yellow" // Expires between 8 and 30 days
  } else {
    return "green" // Expires in more than 30 days
  }
}

export function getUrgencyColors(status: UrgencyStatus): { bgColor: string; textColor: string; borderColor?: string } {
  switch (status) {
    case "expired":
      return {
        bgColor: "bg-red-100 dark:bg-red-900",
        textColor: "text-red-800 dark:text-red-200",
        borderColor: "border-red-500",
      }
    case "red":
      return {
        bgColor: "bg-red-100 dark:bg-red-900",
        textColor: "text-red-800 dark:text-red-200",
        borderColor: "border-red-500",
      }
    case "yellow":
      return {
        bgColor: "bg-yellow-100 dark:bg-yellow-900",
        textColor: "text-yellow-800 dark:text-yellow-200",
        borderColor: "border-yellow-500",
      }
    case "green":
      return {
        bgColor: "bg-green-100 dark:bg-green-900",
        textColor: "text-green-800 dark:text-green-200",
        borderColor: "border-green-500",
      }
    default:
      return { bgColor: "bg-gray-100 dark:bg-gray-800", textColor: "text-gray-800 dark:text-gray-200" }
  }
}

export function getUrgencyLabel(status: UrgencyStatus): string {
  switch (status) {
    case "expired":
      return "Vencida"
    case "red":
      return "Urgente"
    case "yellow":
      return "Próxima"
    case "green":
      return "Activa"
    default:
      return "Desconocido"
  }
}
