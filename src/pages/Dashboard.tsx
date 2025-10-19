import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { 
  Package, 
  Users, 
  TrendingUp, 
  LogOut,
  BarChart3,
  Settings,
  CalendarIcon,
  Menu
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [profile, setProfile] = useState<any>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStock: 0,
    totalCustomers: 0,
    creditCustomers: 0,
  });
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

      supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
        loadStats(selectedDate);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const loadStats = async (filterDate?: Date) => {
    // Load store settings
    const { data: settings } = await supabase.from("store_settings").select("*").single();
    if (settings) setCurrency(settings.currency as CurrencyCode);

    const targetDate = filterDate || selectedDate;
    const today = targetDate.toISOString().split('T')[0];
    
    // Load sales
    const { data: salesData } = await supabase
      .from("sales")
      .select("total, created_at, payment_method");

    if (salesData) {
      const totalSales = salesData.reduce((sum, sale) => sum + Number(sale.total), 0);
      const todaySales = salesData
        .filter((sale) => sale.created_at.startsWith(today))
        .reduce((sum, sale) => sum + Number(sale.total), 0);

      // Sales by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const salesByDayData = last7Days.map((day) => {
        const dayName = new Date(day).toLocaleDateString("fr-FR", { weekday: "short" });
        const dayTotal = salesData
          .filter((sale) => sale.created_at.startsWith(day))
          .reduce((sum, sale) => sum + Number(sale.total), 0);
        return { name: dayName, ventes: dayTotal };
      });
      setSalesByDay(salesByDayData);

      // Payment methods distribution
      const paymentStats: Record<string, number> = {};
      salesData.forEach((sale) => {
        const method = sale.payment_method || "cash";
        paymentStats[method] = (paymentStats[method] || 0) + 1;
      });
      const paymentData = Object.entries(paymentStats).map(([name, value]) => ({
        name,
        value,
      }));
      setPaymentMethods(paymentData);

      setStats((prev) => ({ ...prev, totalSales, todaySales }));
    }

    // Load products
    const { data: productsData } = await supabase
      .from("products")
      .select("id, stock_quantity, min_stock_level");

    if (productsData) {
      const lowStock = productsData.filter(
        (p: any) => p.stock_quantity <= (p.min_stock_level || 10)
      ).length;
      setStats((prev) => ({ ...prev, totalProducts: productsData.length, lowStock }));
    }

    // Load customers
    const { data: customersData } = await supabase.from("customers").select("current_credit");
    if (customersData) {
      const creditCustomers = customersData.filter((c) => (c.current_credit || 0) > 0).length;
      setStats((prev) => ({ ...prev, totalCustomers: customersData.length, creditCustomers }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/auth");
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <img src="/logo.png" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {profile?.business_name || "Mon Commerce"}
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Bienvenue, {profile?.full_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="md:w-auto md:px-4"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-2">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    loadStats(date);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ventes Totales
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.totalSales, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aujourd'hui: {formatCurrency(stats.todaySales, currency)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produits
              </CardTitle>
              <Package className="w-4 h-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {stats.totalProducts}
              </div>
              <p className="text-xs text-destructive mt-1">
                {stats.lowStock} en stock faible
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clients
              </CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {stats.totalCustomers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.creditCustomers} avec crédit
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock Bas
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {stats.lowStock}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventes des 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ventes" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Méthodes de paiement</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${Math.round(entry.percent * 100)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;