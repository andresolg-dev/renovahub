"use client"

import type React from "react"
import { useState } from "react"
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, FileText } from 'lucide-react'
import * as XLSX from "xlsx" // Import xlsx library

interface ImportLicensesDialogProps {
  onSuccess: () => void
  onClose: () => void
  importType: "excel" | "google_sheets" // New prop to distinguish import type
  googleSheetsConfig?: { spreadsheetId: string; sheetName: string; enabled: boolean } | null // Pass GS config
}

interface ParsedLicenseData {
  software_name: string
  renewal_date: string // Will be parsed to Date on server
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status?: string // Optional, defaults to 'active'
}

export default function ImportLicensesDialog({ onSuccess, onClose, importType, googleSheetsConfig }: ImportLicensesDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedLicenseData[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(googleSheetsConfig?.spreadsheetId || "") // For Google Sheets import
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFileName(selectedFile.name)
      parseFile(selectedFile)
    } else {
      setFile(null)
      setFileName(null)
      setParsedData([])
    }
  }

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array", cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Get raw data as array of arrays (including header row)
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (rawData.length < 2) {
          throw new Error("El archivo debe tener al menos una fila de encabezados y una fila de datos.")
        }

        // Skip the header row (first row) and map data by column position
        const mappedData: ParsedLicenseData[] = rawData.slice(1).map((row, index) => {
          // Expected column order: Software Name, Renewal Date, Amount, Currency, Responsible Email, Renewal URL, Status
          const software_name = row[0] ? String(row[0]).trim() : ""
          const renewal_date_raw = row[1]
          const ammount_raw = row[2]
          const currency = row[3] ? String(row[3]).trim() : "USD"
          const responsible_email = row[4] ? String(row[4]).trim() : ""
          const renewal_url = row[5] ? String(row[5]).trim() : ""
          const status = row[6] ? String(row[6]).trim() : "active"

          // Parse renewal date
          let renewal_date = ""
          if (renewal_date_raw) {
            try {
              // Handle different date formats
              const date = new Date(renewal_date_raw)
              if (!isNaN(date.getTime())) {
                renewal_date = date.toISOString()
              }
            } catch (dateError) {
              console.warn(`Error parsing date in row ${index + 2}:`, renewal_date_raw)
            }
          }

          // Parse amount
          let ammount = 0
          if (ammount_raw) {
            const parsed = parseFloat(String(ammount_raw).replace(/[^0-9.-]/g, ''))
            if (!isNaN(parsed)) {
              ammount = parsed
            }
          }

          return {
            software_name,
            renewal_date,
            ammount,
            currency,
            responsible_email,
            renewal_url,
            status,
          }
        }).filter(item => 
          item.software_name && 
          item.renewal_date && 
          item.responsible_email &&
          item.ammount > 0
        ) // Basic validation

        setParsedData(mappedData)
        toast({
          title: "Archivo cargado",
          description: `Se han detectado ${mappedData.length} licencias válidas en el archivo.`,
        })
      } catch (error: any) {
        toast({
          title: "Error al leer el archivo",
          description: `Asegúrate de que sea un archivo Excel o CSV válido. ${error.message}`,
          variant: "destructive",
        })
        setParsedData([])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (importType === "excel") {
      if (parsedData.length === 0) {
        toast({
          title: "No hay datos para importar",
          description: "Por favor, carga un archivo con licencias válidas.",
          variant: "destructive",
        })
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/licenses/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ licenses: parsedData }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error desconocido al importar licencias.")
        }

        const result = await response.json()
        toast({
          title: "Importación completada",
          description: `Se importaron ${result.successCount} licencias.`,
        })
        onSuccess()
        onClose()
      } catch (error: any) {
        toast({
          title: "Error al importar licencias",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    } else if (importType === "google_sheets") {
      if (!spreadsheetIdInput) {
        toast({
          title: "ID de Hoja de Cálculo requerido",
          description: "Por favor, ingresa el ID de la hoja de cálculo de Google Sheets.",
          variant: "destructive",
        })
        return
      }
      if (!googleSheetsConfig?.enabled) {
        toast({
          title: "Integración de Google Sheets no habilitada",
          description: "Por favor, habilita la integración de Google Sheets en el panel de Integraciones.",
          variant: "destructive",
        })
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/google-sheets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId: spreadsheetIdInput,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al importar licencias desde Google Sheets.")
        }

        const result = await response.json()
        toast({
          title: "Importación desde Google Sheets completada",
          description: `Se importaron ${result.totalSuccessCount} licencias de ${result.importedSheets.length} pestañas.`,
        })
        onSuccess()
        onClose()
      } catch (error: any) {
        toast({
          title: "Error al importar desde Google Sheets",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Importar Licencias</DialogTitle>
        <DialogDescription>
          {importType === "excel" ? (
            <>
              Sube un archivo Excel (.xlsx) o CSV (.csv) para importar licencias.
              <br />
              <span className="font-semibold">Orden de columnas requerido:</span>
              <br />
              1. Nombre del Software | 2. Fecha de Renovación | 3. Monto | 4. Moneda | 5. Email Responsable | 6. URL de Renovación | 7. Estado
              <br />
              <span className="text-sm text-muted-foreground">
                La primera fila puede tener cualquier nombre de encabezado, pero el orden de las columnas debe respetarse.
                <br />
                <a 
                  href="/IMPORT_FORMAT.md" 
                  target="_blank" 
                  className="text-primary hover:underline"
                >
                  📋 Ver guía detallada de formato
                </a>
              </span>
            </>
          ) : (
            <>
              Ingresa el ID de la hoja de cálculo de Google Sheets para importar licencias.
              <br />
              Se leerán todas las pestañas que contengan datos en el orden correcto.
              <br />
              <span className="font-semibold">Orden de columnas requerido:</span>
              <br />
              1. Nombre del Software | 2. Fecha de Renovación | 3. Monto | 4. Moneda | 5. Email Responsable | 6. URL de Renovación | 7. Estado
              <br />
              <span className="text-sm text-muted-foreground">
                La primera fila puede tener cualquier nombre de encabezado, pero el orden de las columnas debe respetarse.
                <br />
                <a 
                  href="/IMPORT_FORMAT.md" 
                  target="_blank" 
                  className="text-primary hover:underline"
                >
                  📋 Ver guía detallada de formato
                </a>
              </span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {importType === "excel" ? (
          <div className="grid gap-2">
            <Label htmlFor="file-upload">Seleccionar archivo</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label
                htmlFor="file-upload"
                className="flex-1 flex items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
              >
                <UploadCloud className="mr-2 h-5 w-5 text-muted-foreground" />
                {fileName ? (
                  <span className="text-sm text-foreground">{fileName}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Arrastra o haz clic para seleccionar un archivo</span>
                )}
              </Label>
            </div>
            {parsedData.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Se detectaron {parsedData.length} filas válidas para importar.
                </p>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold mb-2">Vista previa de los primeros 3 registros:</p>
                  {parsedData.slice(0, 3).map((license, index) => (
                    <div key={index} className="text-xs mb-2 p-2 bg-muted/50 rounded">
                      <div><strong>Software:</strong> {license.software_name}</div>
                      <div><strong>Fecha:</strong> {new Date(license.renewal_date).toLocaleDateString()}</div>
                      <div><strong>Monto:</strong> {license.ammount} {license.currency}</div>
                      <div><strong>Responsable:</strong> {license.responsible_email}</div>
                    </div>
                  ))}
                  {parsedData.length > 3 && (
                    <p className="text-xs text-muted-foreground">... y {parsedData.length - 3} más</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="spreadsheet-id">ID de la Hoja de Cálculo de Google Sheets</Label>
            <Input
              id="spreadsheet-id"
              value={spreadsheetIdInput}
              onChange={(e) => setSpreadsheetIdInput(e.target.value)}
              placeholder="Ingresa el ID de tu Google Sheet"
              disabled={!googleSheetsConfig?.enabled}
            />
            {!googleSheetsConfig?.enabled && (
              <p className="text-sm text-red-500">
                La integración de Google Sheets no está habilitada. Habilítala en el panel de Integraciones.
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleImport}
          disabled={
            loading ||
            (importType === "excel" && (!file || parsedData.length === 0)) ||
            (importType === "google_sheets" && (!spreadsheetIdInput || !googleSheetsConfig?.enabled))
          }
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" /> Importar
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
