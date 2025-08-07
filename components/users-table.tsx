"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from "firebase/firestore" // Import getDoc
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import EditUserRoleForm from "./edit-user-role-form"
import AddUserForm from "./add-user-form" // Import AddUserForm
import { DocumentReference } from "firebase/firestore" // Import DocumentReference type

interface AppUser {
  id: string
  email: string
  name: string
  role_id: DocumentReference // Now expects DocumentReference
  roleName?: string // To store the resolved role name
  created_at: { toDate: () => Date }
  updated_at: { toDate: () => Date }
}

interface AppUserForEditForm {
  id: string
  email: string
  name: string
  role_id: string // Ahora es un string (el ID del rol)
}

export default function UsersTable() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false) // State for AddUserForm dialog
  const [selectedUser, setSelectedUser] = useState<AppUserForEditForm | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("created_at", "asc"))
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const usersDataPromises = snapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data()
        let roleName = "Desconocido"
        if (userData.role_id instanceof DocumentReference) {
          const roleDocSnap = await getDoc(userData.role_id)
          if (roleDocSnap.exists()) {
            roleName = roleDocSnap.data().name
          }
        } else if (typeof userData.role === "string") {
          // Fallback for old string-based role
          roleName = userData.role
        }

        return {
          id: userDoc.id,
          ...userData,
          roleName, // Add resolved role name
        } as AppUser
      })
      const usersData = await Promise.all(usersDataPromises)
      setUsers(usersData)
      console.log("Usuarios obtenidos de Firestore:", usersData)
    })

    return () => unsubscribe()
  }, [])

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      // Call the new API route to delete user from Auth and Firestore
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error desconocido al eliminar usuario.")
      }

      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userEmail} ha sido eliminado exitosamente.`,
      })
    } catch (error: any) {
      toast({
        title: "Error al eliminar usuario",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (user: AppUser) => {
    const simplifiedUser: AppUserForEditForm = {
      id: user.id,
      email: user.email,
      name: user.name,
      role_id: user.role_id.id, // Extrae solo el ID del DocumentReference
    }
    setSelectedUser(simplifiedUser)
    setIsEditFormOpen(true)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <DialogTrigger asChild>
            <Button>Agregar Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Ingresa los detalles del nuevo usuario. Se creará una cuenta de autenticación y un perfil en Firestore.
              </DialogDescription>
            </DialogHeader>
            <AddUserForm onSuccess={() => setIsAddFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo Electrónico</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.roleName}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar Rol</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Eliminar Usuario</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario {user.email} de
                              Firebase Authentication y de nuestros servidores.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.email)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Rol de Usuario</DialogTitle>
              <DialogDescription>Modifica el rol del usuario seleccionado.</DialogDescription>
            </DialogHeader>
            <EditUserRoleForm user={selectedUser} onSuccess={() => setIsEditFormOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
