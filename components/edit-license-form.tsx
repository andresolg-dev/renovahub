"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { doc, updateDoc, serverTimestamp, getDocs, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { DatePicker } from "./date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditLicenseFormProps {
  license: License
  onSuccess: () => void
}

interface License {
  id: string
  software_name: string
  renewal_date: { toDate: () => Date } | Date | null
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status: string
  created_at: { toDate: () => Date }
  updated_at: { toDate: () => Date }
}

interface UserOption {
  uid: string
  email: string
  name: string
}

export default function EditLicenseForm({ license, onSuccess }: EditLicenseFormProps) {
  const [softwareName, setSoftwareName] = useState(license.software_name)
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(
    license.renewal_date instanceof Date ? license.renewal_date : license.renewal_date?.toDate() || undefined,
  )
  const [amount, setAmount] = useState(license.ammount.toString())
  const [currency, setCurrency] = useState(license.currency)
  const [responsibleEmail, setResponsibleEmail] = useState(license.responsible_email)
  const [renewalUrl, setRenewalUrl] = useState(license.renewal_url)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = collection(db, "users")
      const userSnapshot = await getDocs(usersCollection)
      const userList = userSnapshot.docs.map((doc) => ({
        uid: doc.id,
        email: doc.data().email,
        name: doc.data().name || doc.data().email,
      }))
      setUsers(userList)
    }
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const licenseRef = doc(db, "licenses", license.id)
      await updateDoc(licenseRef, {
        software_name: softwareName,
        renewal_date: renewalDate ? renewalDate : null,
        ammount: Number.parseFloat(amount),
        currency: currency,
        responsible_email: responsibleEmail,
        renewal_url: renewalUrl,
        updated_at: serverTimestamp(),
      })
      toast({
        title: "Licencia actualizada",
        description: "Los detalles de la licencia han sido guardados.",
      })
      // Trigger notification for license update
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "license_updated",
            licenseId: license.id,
          }),
        })
      } catch (error) {
        console.error("Error sending license update notification:", error)
      }
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Error al actualizar licencia",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="softwareName">Software</Label>
        <Input
          id="softwareName"
          value={softwareName}
          onChange={(e) => setSoftwareName(e.target.value)}
          className="w-full"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="renewalDate">Fecha de Renovación</Label>
        <DatePicker date={renewalDate} setDate={setRenewalDate} />
      </div>
      <div className="grid gap-2 md:grid-cols-3 md:gap-4">
        <div className="md:col-span-2 grid gap-2">
          <Label htmlFor="amount">Costo</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency" className="sr-only">
            Moneda
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="COP">COP</SelectItem> {/* Changed from MXN to COP */}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="responsibleEmail">Responsable</Label>
        <Select value={responsibleEmail} onValueChange={setResponsibleEmail}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un responsable" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.uid} value={user.email}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="renewalUrl">URL de Renovación</Label>
        <Textarea
          id="renewalUrl"
          value={renewalUrl}
          onChange={(e) => setRenewalUrl(e.target.value)}
          className="w-full"
          placeholder="Enlace directo a la página de pago/facturación"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}
