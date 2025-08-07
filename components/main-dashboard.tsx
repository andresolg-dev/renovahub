"use client"

import { useEffect, useState } from "react"
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, startOfDay, endOfDay, addDays, subDays, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  Server,
  Mail,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getLicenseUrgency, getUrgencyColors, getUrgencyLabel } from "@/lib/license-utils"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPieChart, Cell, LineChart, Line, Area, AreaChart, Pie } from 'recharts'

interface License {
  id: string
  software_name: string
  renewal_date: { toDate: () => Date }
  ammount: number
  currency: string
  responsible_email: string
  renewal_url: string
  status: string
  sourceSheet?: string
  created_at: { toDate: () => Date }
  updated_at: { toDate: () => Date }
}

interface DashboardStats {
  totalLicenses: number
  activeLicenses: number
  expiredLicenses: number
  expiringThisMonth: number
  expiringNext30Days: number
  totalCost: number
  averageCost: number
  topCurrency: string
  uniqueResponsibles: number
  recentlyAdded: number
}

interface ChartData {
  name: string
  value: number
  color?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function MainDashboard() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    expiringThisMonth: 0,
    expiringNext30Days: 0,
    totalCost: 0,
    averageCost: 0,
    topCurrency: 'USD',
    uniqueResponsibles: 0,
    recentlyAdded: 0
  })
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([])
  const [statusData, setStatusData] = useState<ChartData[]>([])
  const [costByCurrency, setCostByCurrency] = useState<ChartData[]>([])
  const [upcomingRenewals, setUpcomingRenewals] = useState<License[]>([])

  useEffect(() => {
    setLoading(true)
    
    const q = query(collection(db, "licenses"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const licensesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as License[]
        
        setLicenses(licensesData)
        calculateStats(licensesData)
        generateChartData(licensesData)
        setLoading(false)
      } catch (err) {
        console.error("Error processing licenses data:", err)
        setLoading(false)
      }
    }, (error) => {
      console.error("Error fetching licenses:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const calculateStats = (licensesData: License[]) => {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)
    const next30Days = addDays(now, 30)
    const last7Days = subDays(now, 7)

    const activeLicenses = licensesData.filter(l => l.status === 'active')
    const expiredLicenses = licensesData.filter(l => {
      const renewalDate = l.renewal_date?.toDate()
      return renewalDate && renewalDate < now
    })

    const expiringThisMonth = activeLicenses.filter(l => {
      const renewalDate = l.renewal_date?.toDate()
      return renewalDate && renewalDate >= startOfThisMonth && renewalDate <= endOfThisMonth
    })

    const expiringNext30Days = activeLicenses.filter(l => {
      const renewalDate = l.renewal_date?.toDate()
      return renewalDate && renewalDate >= now && renewalDate <= next30Days
    })

    const recentlyAdded = licensesData.filter(l => {
      const createdDate = l.created_at?.toDate()
      return createdDate && createdDate >= last7Days
    })

    const totalCost = activeLicenses.reduce((sum, l) => sum + (l.ammount || 0), 0)
    const averageCost = activeLicenses.length > 0 ? totalCost / activeLicenses.length : 0

    // Find most common currency
    const currencyCount = activeLicenses.reduce((acc, l) => {
      acc[l.currency] = (acc[l.currency] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topCurrency = Object.keys(currencyCount).reduce((a, b) => 
      currencyCount[a] > currencyCount[b] ? a : b, 'USD'
    )

    const uniqueResponsibles = new Set(licensesData.map(l => l.responsible_email)).size

    setStats({
      totalLicenses: licensesData.length,
      activeLicenses: activeLicenses.length,
      expiredLicenses: expiredLicenses.length,
      expiringThisMonth: expiringThisMonth.length,
      expiringNext30Days: expiringNext30Days.length,
      totalCost,
      averageCost,
      topCurrency,
      uniqueResponsibles,
      recentlyAdded: recentlyAdded.length
    })

    // Set upcoming renewals (next 30 days)
    const upcoming = expiringNext30Days
      .sort((a, b) => a.renewal_date.toDate().getTime() - b.renewal_date.toDate().getTime())
      .slice(0, 5)
    setUpcomingRenewals(upcoming)
  }

  const generateChartData = (licensesData: License[]) => {
    // Monthly renewals data
    const monthlyRenewals = licensesData.reduce((acc, license) => {
      const renewalDate = license.renewal_date?.toDate()
      if (renewalDate) {
        const monthKey = format(renewalDate, 'MMM yyyy', { locale: es })
        acc[monthKey] = (acc[monthKey] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const monthlyChartData = Object.entries(monthlyRenewals)
      .map(([month, count]) => ({ name: month, value: count }))
      .slice(-6) // Last 6 months

    setMonthlyData(monthlyChartData)

    // Status distribution
    const statusCount = licensesData.reduce((acc, license) => {
      const urgency = getLicenseUrgency(license.renewal_date.toDate())
      acc[urgency] = (acc[urgency] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusChartData = Object.entries(statusCount).map(([status, count]) => ({
      name: getUrgencyLabel(status),
      value: count,
      color: getUrgencyColors(status).bgColor
    }))

    setStatusData(statusChartData)

    // Cost by currency
    const costByCurrencyData = licensesData.reduce((acc, license) => {
      if (license.status === 'active') {
        acc[license.currency] = (acc[license.currency] || 0) + license.ammount
      }
      return acc
    }, {} as Record<string, number>)

    const currencyChartData = Object.entries(costByCurrencyData).map(([currency, cost]) => ({
      name: currency,
      value: Math.round(cost)
    }))

    setCostByCurrency(currencyChartData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Principal</h1>
        <p className="text-muted-foreground">
          Resumen completo de tus licencias de software
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licencias</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLicenses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeLicenses} activas, {stats.expiredLicenses} vencidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCost.toLocaleString()} {stats.topCurrency}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio: {Math.round(stats.averageCost)} {stats.topCurrency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencen en 30 días</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringNext30Days}</div>
            <p className="text-xs text-muted-foreground">
              {stats.expiringThisMonth} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueResponsibles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentlyAdded} agregadas esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly Renewals */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Renovaciones por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Estado de Licencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Renewals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Renovaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingRenewals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay renovaciones próximas</p>
              ) : (
                upcomingRenewals.map((license) => {
                  const urgency = getLicenseUrgency(license.renewal_date.toDate())
                  const { bgColor, textColor } = getUrgencyColors(urgency)
                  const label = getUrgencyLabel(urgency)
                  
                  return (
                    <div key={license.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{license.software_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(license.renewal_date.toDate(), "PPP", { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {license.ammount} {license.currency}
                        </p>
                      </div>
                      <Badge className={`${bgColor} ${textColor}`}>
                        {label}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost by Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Costos por Moneda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costByCurrency.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Base de Datos</span>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Conectado
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Servidor SMTP</span>
              </div>
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Configurar
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                <span>Google Sheets API</span>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Activo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}