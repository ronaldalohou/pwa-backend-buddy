import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface FinancialData {
  totalSales: number;
  totalPurchaseCosts: number;
  totalExpenses: number;
  profit: number;
  salesCount: number;
  expensesCount: number;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [data, setData] = useState<FinancialData>({
    totalSales: 0,
    totalPurchaseCosts: 0,
    totalExpenses: 0,
    profit: 0,
    salesCount: 0,
    expensesCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrency();
    loadFinancialData();
  }, []);

  const loadCurrency = async () => {
    const { data } = await supabase.from("store_settings").select("currency").single();
    if (data) setCurrency(data.currency as CurrencyCode);
  };

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total, created_at, sale_items(quantity, unit_price, product_id, products(cost_price))")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);

      if (salesError) throw salesError;

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .gte("date", startDate)
        .lte("date", endDate);

      if (expensesError) throw expensesError;

      // Calculate totals
      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      
      // Calculate purchase costs (cost_price * quantity for all sold items)
      let totalPurchaseCosts = 0;
      salesData?.forEach((sale: any) => {
        sale.sale_items?.forEach((item: any) => {
          const costPrice = item.products?.cost_price || 0;
          totalPurchaseCosts += Number(costPrice) * item.quantity;
        });
      });

      const totalExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const profit = totalSales - totalPurchaseCosts - totalExpenses;

      setData({
        totalSales,
        totalPurchaseCosts,
        totalExpenses,
        profit,
        salesCount: salesData?.length || 0,
        expensesCount: expensesData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading financial data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Rapport Financier", pageWidth / 2, y, { align: "center" });
    
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Période: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(new Date(endDate), "dd/MM/yyyy")}`, pageWidth / 2, y, { align: "center" });
    
    y += 15;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 15;

    // Financial Data
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Chiffre d'affaires (Ventes):", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(data.totalSales, currency), pageWidth - 15, y, { align: "right" });
    
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Coûts d'achat:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(`-${formatCurrency(data.totalPurchaseCosts, currency)}`, pageWidth - 15, y, { align: "right" });
    
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Dépenses:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(`-${formatCurrency(data.totalExpenses, currency)}`, pageWidth - 15, y, { align: "right" });
    
    y += 15;
    doc.setLineWidth(1);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bénéfice Net:", 15, y);
    doc.text(formatCurrency(data.profit, currency), pageWidth - 15, y, { align: "right" });

    doc.save(`rapport-financier-${startDate}-${endDate}.pdf`);
    toast.success("PDF exporté avec succès");
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Indicateur": "Chiffre d'affaires (Ventes)", "Montant": data.totalSales, "Devise": currency },
      { "Indicateur": "Coûts d'achat", "Montant": -data.totalPurchaseCosts, "Devise": currency },
      { "Indicateur": "Dépenses", "Montant": -data.totalExpenses, "Devise": currency },
      { "Indicateur": "Bénéfice Net", "Montant": data.profit, "Devise": currency },
      { "Indicateur": "", "Montant": "", "Devise": "" },
      { "Indicateur": "Nombre de ventes", "Montant": data.salesCount, "Devise": "" },
      { "Indicateur": "Nombre de dépenses", "Montant": data.expensesCount, "Devise": "" },
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport Financier");
    XLSX.writeFile(wb, `rapport-financier-${startDate}-${endDate}.xlsx`);
    toast.success("Excel exporté avec succès");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analyses Financières</h1>
            <p className="text-muted-foreground">Bénéfices et chiffre d'affaires sur période</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner la période</CardTitle>
          <CardDescription>Choisissez les dates de début et de fin pour l'analyse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadFinancialData} disabled={loading} className="w-full">
                {loading ? "Chargement..." : "Analyser"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalSales, currency)}</div>
            <p className="text-xs text-muted-foreground">{data.salesCount} vente(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coûts d'achat</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{formatCurrency(data.totalPurchaseCosts, currency)}
            </div>
            <p className="text-xs text-muted-foreground">Prix de revient des produits vendus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{formatCurrency(data.totalExpenses, currency)}
            </div>
            <p className="text-xs text-muted-foreground">{data.expensesCount} dépense(s)</p>
          </CardContent>
        </Card>

        <Card className={data.profit >= 0 ? "border-green-500" : "border-red-500"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
            <TrendingUp className={`h-4 w-4 ${data.profit >= 0 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(data.profit, currency)}
            </div>
            <p className="text-xs text-muted-foreground">Ventes - Achats - Dépenses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exporter les données</CardTitle>
          <CardDescription>Téléchargez le rapport au format PDF ou Excel</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={exportToPDF} variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
