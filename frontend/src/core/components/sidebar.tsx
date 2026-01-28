"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/core/components/ui/button"
import { 
    LayoutDashboard, 
    Inbox, 
    LogOut, 
    User,
    Building2
} from "lucide-react"
import Link from "next/link"

export function Sidebar() {
    const { data: session } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = async () => {
        await signOut({ 
            callbackUrl: "/auth/login",
            redirect: true 
        })
    }

    const isActive = (path: string) => {
        if (path === "/dashboard" && pathname === "/dashboard") return true
        if (path === "/dashboard/inbox" && pathname === "/dashboard/inbox") return true
        if (path !== "/dashboard" && pathname?.startsWith(path)) return true
        return false
    }

    return (
        <div className="flex flex-col h-screen w-64 border-r bg-sidebar border-sidebar-border">
            {/* User Info */}
            <div className="p-4 border-b border-sidebar-border bg-white">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-sidebar-foreground">
                            {session?.user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {session?.user?.phone || "No phone"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                <Link href="/dashboard">
                    <Button
                        variant={isActive("/dashboard") ? "default" : "ghost"}
                        className={`w-full justify-start ${
                            isActive("/dashboard") 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                </Link>
                <Link href="/dashboard/inbox">
                    <Button
                        variant={isActive("/dashboard/inbox") ? "default" : "ghost"}
                        className={`w-full justify-start ${
                            isActive("/dashboard/inbox") 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                    >
                        <Inbox className="mr-2 h-4 w-4" />
                        Inbox
                    </Button>
                </Link>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-sidebar-border bg-white">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )
}
