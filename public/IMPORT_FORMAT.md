# Formato de Importación de Licencias

## Orden de Columnas Requerido

Para importar licencias desde Excel/CSV o Google Sheets, las columnas deben estar en el siguiente orden:

| Posición | Campo | Descripción | Ejemplo |
|----------|-------|-------------|---------|
| 1 | **Nombre del Software** | Nombre del software o servicio | "Microsoft Office 365" |
| 2 | **Fecha de Renovación** | Fecha cuando vence la licencia | "2024-12-31" o "31/12/2024" |
| 3 | **Monto** | Costo de la licencia (solo números) | 299.99 |
| 4 | **Moneda** | Código de moneda | "USD", "EUR", "COP" |
| 5 | **Email Responsable** | Email del responsable de la licencia | "admin@empresa.com" |
| 6 | **URL de Renovación** | Enlace para renovar (opcional) | "https://portal.microsoft.com" |
| 7 | **Estado** | Estado de la licencia (opcional) | "active", "inactive", "expired" |

## Notas Importantes

### Encabezados
- La **primera fila** puede tener cualquier nombre de encabezado
- Los nombres de las columnas no importan, solo el **orden**
- Puedes usar nombres en español, inglés o cualquier idioma

### Formatos de Fecha Aceptados
- ISO: `2024-12-31`
- Formato español: `31/12/2024`
- Formato americano: `12/31/2024`
- Excel automáticamente: Las fechas de Excel se procesan correctamente

### Validaciones
- **Software Name**: Obligatorio, no puede estar vacío
- **Fecha de Renovación**: Obligatorio, debe ser una fecha válida
- **Monto**: Obligatorio, debe ser mayor a 0
- **Email Responsable**: Obligatorio, debe tener formato de email válido
- **Moneda**: Opcional, por defecto "USD"
- **URL de Renovación**: Opcional
- **Estado**: Opcional, por defecto "active"

## Ejemplo de Archivo Excel/CSV

```
Software                | Fecha Vencimiento | Precio | Moneda | Responsable           | Link Renovación              | Estado
Microsoft Office 365    | 2024-12-31       | 299.99 | USD    | admin@empresa.com     | https://portal.microsoft.com | active
Adobe Creative Suite    | 2024-06-15       | 599.00 | USD    | design@empresa.com    | https://adobe.com/renew      | active
Slack Premium           | 2024-03-20       | 96.00  | USD    | hr@empresa.com        |                              | active
```

## Para Google Sheets

1. Crea una hoja de cálculo en Google Sheets
2. Asegúrate de que las columnas estén en el orden correcto
3. Puedes tener múltiples pestañas, todas se importarán
4. Cada pestaña se marcará como "fuente" en el sistema
5. Copia el ID de la hoja de cálculo desde la URL:
   - URL: `https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit`
   - ID: `1ABC123DEF456`

## Consejos

- **Revisa la vista previa** antes de importar para verificar que los datos se lean correctamente
- **Elimina filas vacías** para evitar errores
- **Usa formatos de fecha consistentes** en todo el archivo
- **Verifica los emails** para evitar errores de validación