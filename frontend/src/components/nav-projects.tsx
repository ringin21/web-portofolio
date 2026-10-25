import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MoreHorizontalIcon, FolderIcon, ExternalLinkIcon, PencilIcon } from "lucide-react"

// shadcn sidebar-07 NavProjects: quick access to the latest portfolio projects.
export function NavProjects({
  projects,
  onManage,
}: {
  projects: {
    name: string
    url: string
  }[]
  onManage: () => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const manage = () => {
    onManage()
    setOpenMobile(false)
  }

  if (!projects.length) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Proyek terbaru</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                <FolderIcon />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="aria-expanded:bg-muted"
                >
                  <MoreHorizontalIcon
                  />
                  <span className="sr-only">Aksi proyek</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-fit"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem asChild>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon
                    />
                    <span>Buka tautan</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={manage}>
                  <PencilIcon
                  />
                  <span>Kelola proyek</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70" onClick={manage}>
            <MoreHorizontalIcon className="text-sidebar-foreground/70" />
            <span>Lihat semua</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
