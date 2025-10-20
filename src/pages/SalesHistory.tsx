import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, CurrencyCode, PAYMENT_METHODS } from "@/utils/currency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Sale {
  id: string;
  created_at: string;
  sale_number: string;
  total: number;
  payment_method: string;
  amount_paid: number;
  customer_id: string | null;
  customers: { name: string } | null;
  sale_items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadCurrency();
    loadSales();
  }, []);

  const loadCurrency = async () => {
    const { data } = await supabase.from("store_settings").select("currency").single();
    if (data) setCurrency(data.currency as CurrencyCode);
  };

  const loadSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          sale_number,
          total,
          payment_method,
          amount_paid,
          customer_id,
          customers (name),
          sale_items (
            product_name,
            quantity,
            unit_price,
            subtotal
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  const getPaymentDetails = (sale: Sale) => {
    const paymentMethodName = PAYMENT_METHODS[sale.payment_method as keyof typeof PAYMENT_METHODS]?.name || sale.payment_method;
    
    if (sale.payment_method === 'cash') {
      const change = sale.amount_paid - sale.total;
      return (
        <div className="space-y-1">
          <div className="font-medium">{paymentMethodName}</div>
          <div className="text-sm text-muted-foreground">
            Montant payé: {formatCurrency(sale.amount_paid, currency)}
          </div>
          {change > 0 && (
            <div className="text-sm text-muted-foreground">
              Monnaie rendue: {formatCurrency(change, currency)}
            </div>
          )}
        </div>
      );
    }
    
    return <div className="font-medium">{paymentMethodName}</div>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Historique des Ventes</h1>
          <p className="text-muted-foreground">Toutes les transactions effectuées</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des ventes</CardTitle>
          <CardDescription>Consultez le détail de chaque vente</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune vente enregistrée</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>N° Vente</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{format(new Date(sale.created_at), "dd/MM/yyyy", { locale: fr })}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(sale.created_at), "HH:mm:ss")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{sale.customers?.name || "-"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(sale.total, currency)}</TableCell>
                    <TableCell>{getPaymentDetails(sale)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetails(sale)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la vente</DialogTitle>
            <DialogDescription>
              Vente N° {selectedSale?.sale_number} - {selectedSale && format(new Date(selectedSale.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{selectedSale.customers?.name || "Client anonyme"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mode de paiement</div>
                  <div>{getPaymentDetails(selectedSale)}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Articles vendus</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Sous-total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.sale_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price, currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.subtotal, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total, currency)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
