"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { collection, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"

interface EditUserRoleFormProps {
  user: {
    id: string
    email: string
    name: string
    role_id: string // Ahora espera un string (el ID del rol)
  }
  onSuccess: () => void
}

interface RoleOption {
  id: string
  name: string
}

const EditUserRoleForm: React.FC<EditUserRoleFormProps> = ({ user, onSuccess }) => {
  const [selectedRoleId, setSelectedRoleId] = useState(user.role_id) // Initialize with current role_id
  const [roles, setRoles] = useState<RoleOption[]>([]) // State for role options
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchRoles = async () => {
      const rolesCollection = collection(db, "roles")
      const roleSnapshot = await getDocs(rolesCollection)
      const roleList = roleSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setRoles(roleList)
    }
    fetchRoles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userRef = doc(db, "users", user.id)
      const newRoleRef = doc(db, "roles", selectedRoleId) // Create DocumentReference

      await updateDoc(userRef, {
        role_id: newRoleRef, // Store as DocumentReference
        updated_at: serverTimestamp(),
      })
      toast({
        title: "Rol de usuario actualizado",
        description: `El rol de ${user.name} ha sido cambiado.`,
      })
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Error al actualizar rol",
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
        <Label htmlFor="userEmail">Usuario</Label>
        <span id="userEmail" className="text-sm">
          {user.name} ({user.email})
        </span>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Rol</Label>
        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default EditUserRoleForm
