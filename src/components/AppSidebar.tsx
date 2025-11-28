import { LayoutDashboard, Calendar, Car, Users, Umbrella, LogOut, Key } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-dashboard.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Frota", url: "/fleet", icon: Car },
  { title: "Equipe", url: "/team", icon: Users },
  { title: "Férias e Folgas", url: "/vacations", icon: Umbrella },
  { title: "Bonificação", url: "/bonus", icon: Money },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, user, role } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed && <img src={logo} alt="Agendamento" className="w-full h-auto" />}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent transition-smooth"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <Separator />

        <div className="space-y-2">
          <SidebarMenuButton asChild>
            <NavLink
              to="/change-password"
              className="hover:bg-sidebar-accent transition-smooth w-full"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <Key className="h-4 w-4" />
              {!collapsed && <span>Alterar Senha</span>}
            </NavLink>
          </SidebarMenuButton>

          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start hover:bg-sidebar-accent text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>

        {!collapsed && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground px-2">
              <p>
                <span className="font-medium">Versão:</span> 1.2.3
              </p>
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
