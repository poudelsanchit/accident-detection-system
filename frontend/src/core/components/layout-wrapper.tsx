"use client"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    
    // Don't show sidebar on auth pages
    const showSidebar = !pathname?.startsWith("/auth")
    
    if (!showSidebar) {
        return <>{children}</>
    }
    
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
