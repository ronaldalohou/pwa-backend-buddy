import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
  Building2,
  Tag,
  AlertTriangle,
  FileText,
  TrendingUp,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Point de Vente",
    url: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "Produits",
    url: "/products",
    icon: Package,
  },
  {
    title: "Catégories",
    url: "/categories",
    icon: Tag,
  },
  {
    title: "Fournisseurs",
    url: "/suppliers",
    icon: Building2,
  },
  {
    title: "Stock faible",
    url: "/low-stock",
    icon: AlertTriangle,
  },
  {
    title: "Clients",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Rapports",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Clôture caisse",
    url: "/cash-report",
    icon: FileText,
  },
  {
    title: "Mouvements stock",
    url: "/stock-movements",
    icon: TrendingUp,
  },
  {
    title: "Paramètres",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState<string>("");
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchBusinessName();
  }, []);

  const fetchBusinessName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .single();

    if (profile?.business_name) {
      setBusinessName(profile.business_name);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }
    toast.success("Déconnexion réussie");
    navigate("/auth");
  };

  return (
    <Sidebar className={!open ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 flex-shrink-0" />
          {open && (
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
              {businessName || "AfriCaisse"}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {open && <span>{item.title}</span>}
                      {open && <ChevronRight className="ml-auto w-4 h-4" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <Shield className="w-4 h-4" />
                      {open && <span>Administration</span>}
                      {open && <ChevronRight className="ml-auto w-4 h-4" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {open && <span className="ml-2">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
