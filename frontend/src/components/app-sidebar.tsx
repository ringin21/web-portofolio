import * as React from "react"

import BranchedMenu, { type BranchedMenuItem } from "@/components/BranchedMenu"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Account, Portfolio } from "@/lib/types"
import { nav, type Section } from "@/pages/admin/nav"
import { ExternalLinkIcon, LayoutDashboardIcon } from "lucide-react"

const item = (id: Section) => nav.find((n) => n.id === id)!

// shadcn sidebar-07 block, fed with the portfolio instead of sample data.
export function AppSidebar({
  account,
  data,
  section,
  onNavigate,
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  account: Account
  data: Portfolio
  section: Section
  onNavigate: (s: Section) => void
  onLogout: () => void
}) {
  const { setOpenMobile } = useSidebar()
  const leaf = (id: Section): BranchedMenuItem => ({ value: id, label: item(id).label })
  const child = (id: Section) => {
    const { label, icon: Icon } = item(id)
    return { value: id, label, icon: <Icon className="size-4" /> }
  }
  const items: BranchedMenuItem[] = [
    leaf("dashboard"),
    leaf("profil"),
    { label: "Konten", children: (["pengalaman", "pendidikan", "proyek", "keahlian"] as const).map(child) },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          team={{ name: "Portofolio", logo: <span className="text-sm font-bold">P</span>, plan: "Admin Panel" }}
          links={[
            { name: "Dashboard admin", href: "/admin", icon: <LayoutDashboardIcon className="size-4" /> },
            { name: "Situs publik", href: "/", icon: <ExternalLinkIcon className="size-4" />, external: true },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          {/* React Bits branched menu: colors come from the sidebar theme tokens so it follows light/dark. */}
          <BranchedMenu
            items={items}
            active={section}
            defaultOpen={[2]}
            width={220}
            color="var(--sidebar-foreground)"
            accentColor="var(--primary)"
            lineColor="var(--sidebar-border)"
            className="mt-2 ml-2"
            onSelect={(value) => {
              onNavigate(value as Section)
              setOpenMobile(false)
            }}
          />
        </SidebarGroup>
        <NavProjects
          projects={data.projects.slice(0, 3).map((p) => ({ name: p.title, url: p.url }))}
          onManage={() => onNavigate("proyek")}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={account} onProfile={() => onNavigate("profil")} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
