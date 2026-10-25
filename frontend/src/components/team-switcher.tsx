import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon } from "lucide-react"

// shadcn sidebar-07 TeamSwitcher, repurposed: one workspace, switch between the admin and the public site.
export function TeamSwitcher({
  team,
  links,
}: {
  team: {
    name: string
    logo: React.ReactNode
    plan: string
  }
  links: {
    name: string
    href: string
    icon: React.ReactNode
    external?: boolean
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {team.logo}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{team.name}</span>
                <span className="truncate text-xs">{team.plan}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Buka
            </DropdownMenuLabel>
            {links.map((link) => (
              <DropdownMenuItem key={link.name} asChild className="gap-2 p-2">
                <a href={link.href} {...(link.external && { target: "_blank", rel: "noreferrer" })}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {link.icon}
                  </div>
                  {link.name}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
