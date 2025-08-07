"use client"

import { useAuth } from "@/components/auth-provider"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  LogOut, 
  Users, 
  ListChecks, 
  Settings, 
  Bell, 
  BarChart3, 
  Mail,
  Menu,
  Bug,
  X
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter
} from "@/components/ui/sidebar"

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    roles: ["Administrator", "User"]
  },
  {
    name: "Licencias",
    href: "/licenses",
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
    name: "Configuración",
    href: "/config/smtp",
    icon: Settings,
    roles: ["Administrator"]
  },
  {
    name: "Notificaciones",
    href: "/admin/notifications",
    icon: Bell,
    roles: ["Administrator"]
  },
  {
    name: "Debug",
    href: "/debug",
    icon: Bug,
    roles: ["Administrator"]
  }
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Redirigir a login si no hay usuario autenticado
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login")
    }
  }, [user, loading, pathname, router])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Si estamos en la página de login, no mostrar el layout
  if (pathname === "/login" || !user) {
    return <>{children}</>
  }

  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(role || "User")
  )

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-primary tracking-tight">
                Renova<span className="text-foreground">Hub</span>
              </h2>
            </div>
            <SidebarTrigger />
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <SidebarMenuItem key={item.name}>
                    <Link href={item.href} passHref>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        tooltip={item.name}
                      >
                        <a>
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </a>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="text-xs text-muted-foreground px-2 mb-2">
              <div>Usuario: {user.email}</div>
              {role && <div>Rol: {role}</div>}
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset>
          <div className="flex h-full flex-col overflow-auto">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
              <SidebarTrigger>
                <Menu className="h-6 w-6" />
              </SidebarTrigger>
              <div className="md:hidden flex-1 text-center font-semibold">
                RenovaHub
              </div>
              <div className="flex-1" />
            </header>
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}