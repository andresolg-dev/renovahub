"use client"

import React, { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ExternalLink, CheckCircle, Edit, Trash, Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import AddLicenseForm from "./add-license-form"
import EditLicenseForm from "./edit-license-form"
import ImportLicensesDialog from "./import-licenses-dialog"
import { useAuth } from "@/components/auth-provider"
import { getLicenseUrgency, getUrgencyColors, getUrgencyLabel } from "@/lib/license-utils"
import { Badge } from "@/components/ui/badge"

interface License {
  id: string
  software_name: string
  renewal_date: { toDate: () => Date }
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status: string
  sourceSheet?: string // New field for source sheet
  created_at: { toDate: () => Date }
  updated_at: { toDate: () => Date }
}

interface GoogleSheetsConfig {
  spreadsheetId: string
  sheetName: string
  enabled: boolean
}

export default function LicensesTable() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [isImportExcelFormOpen, setIsImportExcelFormOpen] = useState(false) // Separate state for Excel import dialog
  const [isImportGoogleSheetsFormOpen, setIsImportGoogleSheetsFormOpen] = useState(false); // Separate state for Google Sheets import dialog
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig | null>(null)
  const { toast } = useToast()
  const { role } = useAuth()

  useEffect(() => {
    setLoading(true)
    setError(null)
    
    // Start with the simplest possible query to avoid index issues
    console.log("Iniciando consulta de licencias...")
    const simpleQ = query(collection(db, "licenses"))
    
    const unsubscribe = onSnapshot(simpleQ, (snapshot) => {
      try {
        console.log("Snapshot recibido, documentos:", snapshot.docs.length)
        const licensesData = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log("Documento:", doc.id, data)
          return {
            id: doc.id,
            ...data,
          }
        }) as License[]
        
        // Sort by renewal_date first, then by sourceSheet in memory
        const sortedLicenses = licensesData.sort((a, b) => {
          // First sort by renewal date if both have valid dates
          if (a.renewal_date && b.renewal_date) {
            const dateA = a.renewal_date.toDate ? a.renewal_date.toDate() : new Date(a.renewal_date)
            const dateB = b.renewal_date.toDate ? b.renewal_date.toDate() : new Date(b.renewal_date)
            const dateComparison = dateA.getTime() - dateB.getTime()
            if (dateComparison !== 0) return dateComparison
          }
          
          // Then sort by sourceSheet
          const aSheet = a.sourceSheet || "ZZZ_Sin Origen"
          const bSheet = b.sourceSheet || "ZZZ_Sin Origen"
          return aSheet.localeCompare(bSheet)
        })
        
        setLicenses(sortedLicenses)
        setLoading(false)
        setError(null)
        console.log("Licencias procesadas exitosamente:", sortedLicenses.length)
      } catch (err) {
        console.error("Error processing licenses data:", err)
        setError("Error al procesar los datos de licencias")
        setLoading(false)
      }
    }, (error) => {
      console.error("Error fetching licenses:", error)
      setError(`Error al obtener licencias: ${error.message}`)
      setLoading(false)
    })

    const fetchGoogleSheetsConfig = async () => {
      try {
        const integrationsCollection = collection(db, "integrations")
        const snapshot = await getDocs(integrationsCollection)
        const gsConfigDoc = snapshot.docs.find(doc => doc.id === "google_sheets_sync")
        if (gsConfigDoc && gsConfigDoc.exists()) {
          const configData = gsConfigDoc.data().config
          setGoogleSheetsConfig({
            spreadsheetId: configData.spreadsheetId || "",
            sheetName: configData.sheetName || "Licencias",
            enabled: gsConfigDoc.data().enabled || false,
          })
        } else {
          console.warn("Google Sheets integration config not found in Firestore.")
          setGoogleSheetsConfig(null)
        }
      } catch (error) {
        console.error("Error fetching Google Sheets config:", error)
        setGoogleSheetsConfig(null)
      }
    }

    fetchGoogleSheetsConfig()

    return () => unsubscribe()
  }, [])

  const handleMarkAsRenewed = async (licenseId: string) => {
    try {
      const licenseRef = doc(db, "licenses", licenseId)
      await updateDoc(licenseRef, {
        renewal_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        updated_at: serverTimestamp(),
        status: "active",
      })
      toast({
        title: "Licencia renovada",
        description: "La fecha de renovación ha sido actualizada.",
      })
    } catch (error: any) {
      toast({
        title: "Error al renovar",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteLicense = async (licenseId: string) => {
    try {
      await deleteDoc(doc(db, "licenses", licenseId))
      toast({
        title: "Licencia eliminada",
        description: "La licencia ha sido eliminada exitosamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error al eliminar licencia",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (license: License) => {
    setSelectedLicense(license)
    setIsEditFormOpen(true)
  }

  const handleExportExcel = async () => {
    try {
      toast({
        title: "Exportando licencias a Excel...",
        description: "Se está generando el archivo de exportación.",
      })
      const response = await fetch("/api/licenses/export")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al exportar licencias a Excel.")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `renovahub_licenses_${format(new Date(), "yyyyMMdd")}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Exportación completada",
        description: "El archivo de licencias se ha descargado exitosamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error al exportar",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleExportGoogleSheets = async () => {
    if (!googleSheetsConfig?.enabled || !googleSheetsConfig.spreadsheetId || !googleSheetsConfig.sheetName) {
      toast({
        title: "Configuración de Google Sheets incompleta",
        description: "Por favor, configura el ID de la hoja de cálculo y el nombre de la pestaña en el panel de Integraciones.",
        variant: "destructive",
      })
      return
    }

    try {
      toast({
        title: "Exportando licencias a Google Sheets...",
        description: "Se están escribiendo los datos en tu hoja de cálculo.",
      })
      const response = await fetch("/api/google-sheets/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          sheetName: googleSheetsConfig.sheetName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al exportar licencias a Google Sheets.")
      }

      toast({
        title: "Exportación a Google Sheets completada",
        description: "Las licencias se han exportado exitosamente a tu hoja de cálculo.",
      })
    } catch (error: any) {
      toast({
        title: "Error al exportar a Google Sheets",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Group licenses by sourceSheet
  const groupedLicenses = licenses.reduce((acc, license) => {
    const sheetName = license.sourceSheet || "Sin Origen" // Default group for licenses without sourceSheet
    if (!acc[sheetName]) {
      acc[sheetName] = []
    }
    acc[sheetName].push(license)
    return acc
  }, {} as Record<string, License[]>)

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Gestión de Licencias</h1>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog open={isImportExcelFormOpen} onOpenChange={setIsImportExcelFormOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Desde Excel/CSV
                  </DropdownMenuItem>
                </DialogTrigger>
                <ImportLicensesDialog
                  importType="excel"
                  onSuccess={() => { /* Refresh data if needed */ }}
                  onClose={() => setIsImportExcelFormOpen(false)}
                />
              </Dialog>
              <Dialog open={isImportGoogleSheetsFormOpen} onOpenChange={setIsImportGoogleSheetsFormOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!googleSheetsConfig?.enabled}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Desde Google Sheets
                  </DropdownMenuItem>
                </DialogTrigger>
                <ImportLicensesDialog
                  importType="google_sheets"
                  googleSheetsConfig={googleSheetsConfig}
                  onSuccess={() => { /* Refresh data if needed */ }}
                  onClose={() => setIsImportGoogleSheetsFormOpen(false)}
                />
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> A Excel/CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportGoogleSheets} disabled={!googleSheetsConfig?.enabled}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> A Google Sheets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
            <DialogTrigger asChild>
              <Button>Agregar Nueva Licencia</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Agregar Nueva Licencia</DialogTitle>
                <DialogDescription>Ingresa los detalles de la nueva licencia de software.</DialogDescription>
              </DialogHeader>
              <AddLicenseForm onSuccess={() => setIsAddFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Software</TableHead>
              <TableHead>Fecha de Renovación</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                    Cargando licencias...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  <div className="flex items-center justify-center">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay licencias registradas.
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedLicenses).map(([sheetName, licensesInSheet]) => (
                <React.Fragment key={sheetName}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={6} className="font-semibold text-primary">
                      Pestaña: {sheetName}
                    </TableCell>
                  </TableRow>
                  {licensesInSheet.map((license) => {
                    const urgency = getLicenseUrgency(license.renewal_date.toDate())
                    const { bgColor, textColor } = getUrgencyColors(urgency)
                    const label = getUrgencyLabel(urgency)

                    return (
                      <TableRow key={license.id}>
                        <TableCell className="font-medium">{license.software_name}</TableCell>
                        <TableCell>{format(license.renewal_date.toDate(), "PPP")}</TableCell>
                        <TableCell>{`${license.ammount} ${license.currency}`}</TableCell>
                        <TableCell>{license.responsible_email}</TableCell>
                        <TableCell>
                          <Badge className={`${bgColor} ${textColor} transition-opacity hover:opacity-80`}>{label}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(license.renewal_url, "_blank")}
                            disabled={!license.renewal_url}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ir a renovar
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleMarkAsRenewed(license.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como renovado
                          </Button>
                          {role === "Administrator" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEditClick(license)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash className="h-4 w-4 text-red-500" />
                                    <span className="sr-only">Eliminar</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Esto eliminará permanentemente la licencia de
                                      nuestros servidores.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLicense(license.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLicense && (
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Licencia</DialogTitle>
              <DialogDescription>Modifica los detalles de la licencia seleccionada.</DialogDescription>
            </DialogHeader>
            <EditLicenseForm license={selectedLicense} onSuccess={() => setIsEditFormOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
