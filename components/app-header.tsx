"use client"

import Link from "next/link"
import { 
  LogOut, 
  Users, 
  ListChecks, 
  Settings, 
  Bell, 
  BarChart3, 
  Mail,
  Home,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    roles: ["Administrator", "User"]
  },
  {
    name: "Licencias",
    href: "/",
    icon: ListChecks,
    roles: ["Administrator", "User"]
  },
  {
    name: "Usuarios",
    href: "/admin",
    icon: Users,
    roles: ["Administrator"]
  },
  {
    name: "Configuración Email",
    href: "/config/smtp",
    icon: Mail,
    roles: ["Administrator"]
  },
  {
    name: "Integraciones",
    href: "/integrations",
    icon: Settings,
    roles: ["Administrator"]
  },
  {
    name: "Notificaciones",
    href: "/admin/notifications",
    icon: Bell,
    roles: ["Administrator"]
  }
]

export default function AppHeader() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const handleLogoClick = () => {
    router.push("/dashboard")
  }

  if (loading || !user) {
    return null
  }

  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(role || "User")
  )

  return (
    <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-6 p-4 bg-card text-card-foreground rounded-lg shadow-md">
      <div className="flex items-center gap-4 mb-2 md:mb-0">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">
            Renova<span className="text-foreground">Hub</span>
          </h2>
        </button>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>Usuario: {user.email}</span>
          {role && <span>(Rol: {role})</span>}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.name} href={item.href}>
              <Button variant={isActive ? "default" : "ghost"}>
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
        
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </header>
  )
}
