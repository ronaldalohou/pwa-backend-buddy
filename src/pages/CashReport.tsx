import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CashReport = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [report, setReport] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadSettings();
    loadReport();
  }, [navigate, selectedDate]);

  const loadSettings = async () => {
    const { data } = await supabase.from("store_settings").select("*").single();
    if (data) {
      setStoreSettings(data);
      setCurrency(data.currency as CurrencyCode);
    }
  };

  const loadReport = async () => {
    const startDate = `${selectedDate}T00:00:00`;
    const endDate = `${selectedDate}T23:59:59`;

    const [salesRes, expensesRes] = await Promise.all([
      supabase
        .from("sales")
        .select("total, payment_method, payment_status")
        .gte("created_at", startDate)
        .lte("created_at", endDate),
      supabase
        .from("expenses")
        .select("amount")
        .eq("date", selectedDate),
    ]);

    if (salesRes.data) {
      const sales = salesRes.data;
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const totalExpenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const salesByMethod: Record<string, number> = {};
      sales.forEach((sale) => {
        const method = sale.payment_method || "cash";
        salesByMethod[method] = (salesByMethod[method] || 0) + Number(sale.total);
      });

      setReport({
        date: selectedDate,
        totalSales,
        totalExpenses,
        netCash: totalSales - totalExpenses,
        salesByMethod,
        transactionCount: sales.length,
      });
    }
  };

  const generatePDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(storeSettings?.store_name || "Mon Commerce", pageWidth / 2, y, { align: "center" });

    y += 10;
    doc.setFontSize(16);
    doc.text("Rapport de clôture de caisse", pageWidth / 2, y, { align: "center" });

    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date(selectedDate).toLocaleDateString("fr-FR")}`, pageWidth / 2, y, {
      align: "center",
    });

    y += 15;
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Résumé", 15, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre de transactions: ${report.transactionCount}`, 15, y);
    y += 6;
    doc.text(`Ventes totales: ${formatCurrency(report.totalSales, currency)}`, 15, y);
    y += 6;
    doc.text(`Dépenses totales: ${formatCurrency(report.totalExpenses, currency)}`, 15, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Encaissement net: ${formatCurrency(report.netCash, currency)}`, 15, y);

    y += 15;
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Payment methods
    doc.setFontSize(14);
    doc.text("Répartition par mode de paiement", 15, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    Object.entries(report.salesByMethod).forEach(([method, amount]) => {
      const methodName =
        method === "cash"
          ? "Espèces"
          : method === "card"
          ? "Carte bancaire"
          : method === "mobile"
          ? "Mobile money"
          : "Crédit";
      doc.text(`${methodName}: ${formatCurrency(amount as number, currency)}`, 15, y);
      y += 6;
    });

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`,
      pageWidth / 2,
      280,
      { align: "center" }
    );

    doc.save(`Rapport_Caisse_${selectedDate}.pdf`);
    toast.success("Rapport PDF généré avec succès");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Rapport de clôture de caisse
            </h1>
            <p className="text-sm text-muted-foreground">Synthèse quotidienne des transactions</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélectionner une date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="date">Date du rapport</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button onClick={generatePDF} disabled={!report} className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Ventes Totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(report.totalSales, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.transactionCount} transaction{report.transactionCount > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(report.totalExpenses, currency)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Encaissement Net</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(report.netCash, currency)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par mode de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(report.salesByMethod).map(([method, amount]) => {
                    const methodName =
                      method === "cash"
                        ? "Espèces"
                        : method === "card"
                        ? "Carte bancaire"
                        : method === "mobile"
                        ? "Mobile money"
                        : "Crédit";
                    const percentage = ((amount as number / report.totalSales) * 100).toFixed(1);

                    return (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{methodName}</span>
                            <span className="text-muted-foreground">{percentage}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="ml-4 font-bold min-w-[120px] text-right">
                          {formatCurrency(amount as number, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default CashReport;
