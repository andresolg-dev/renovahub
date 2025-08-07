"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { collection, getDocs, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddUserFormProps {
  onSuccess: () => void
}

interface RoleOption {
  id: string
  name: string
}

export default function AddUserForm({ onSuccess }: AddUserFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("") // New state for password
  const [name, setName] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState("") // Stores role document ID
  const [roles, setRoles] = useState<RoleOption[]>([])
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
      // Set default role if available (e.g., "User" role)
      const defaultUserRole = roleList.find((r) => r.name === "User") || roleList.find((r) => r.id === "02")
      if (defaultUserRole) {
        setSelectedRoleId(defaultUserRole.id)
      }
    }
    fetchRoles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Use the API endpoint to create the user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          roleId: selectedRoleId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      toast({
        title: "Usuario agregado",
        description: "El nuevo usuario ha sido registrado en Firebase Authentication y Firestore.",
      })
      onSuccess()
      
      // Reset form
      setEmail("")
      setPassword("")
      setName("")
      // Keep selectedRoleId as default
    } catch (error: any) {
      toast({
        title: "Error al agregar usuario",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <p className="text-sm text-muted-foreground col-span-4">
        Ingresa los detalles del nuevo usuario. Se creará una cuenta de autenticación y un perfil en Firestore.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
          placeholder="usuario@ejemplo.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
          placeholder="Mínimo 6 caracteres"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
          placeholder="Nombre del usuario"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Rol Inicial</Label>
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
          {loading ? "Agregando..." : "Agregar Usuario"}
        </Button>
      </DialogFooter>
    </form>
  )
}
