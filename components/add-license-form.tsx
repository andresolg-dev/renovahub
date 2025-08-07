"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { db } from "@/lib/firebase"
import type { UserOption } from "@/types/types"

const AddLicenseForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [softwareName, setSoftwareName] = useState("")
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(undefined)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [responsibleEmail, setResponsibleEmail] = useState("")
  const [renewalUrl, setRenewalUrl] = useState("")
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
      const docRef = await addDoc(collection(db, "licenses"), {
        software_name: softwareName,
        renewal_date: renewalDate ? renewalDate : null,
        amount: Number.parseFloat(amount),
        currency: currency,
        responsible_email: responsibleEmail, // Keeping as email for now
        renewal_url: renewalUrl,
        status: "active",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      toast({
        title: "Licencia agregada",
        description: "La nueva licencia ha sido registrada exitosamente.",
      })
      // Trigger notification for license creation
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "license_created",
            licenseId: docRef.id, // Necesitarás capturar el ID del documento creado
          }),
        })
      } catch (error) {
        console.error("Error sending license creation notification:", error)
      }
      onSuccess()
      // Reset form
      setSoftwareName("")
      setRenewalDate(undefined)
      setAmount("")
      setCurrency("USD")
      setResponsibleEmail("")
      setRenewalUrl("")
    } catch (error: any) {
      toast({
        title: "Error al agregar licencia",
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
          {loading ? "Guardando..." : "Guardar Licencia"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default AddLicenseForm
