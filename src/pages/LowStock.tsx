import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Package } from "lucide-react";
import { formatCurrency, CurrencyCode } from "@/utils/currency";

const LowStock = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadData();
  }, [navigate]);

  const loadData = async () => {
    const { data: settings } = await supabase.from("store_settings").select("currency").single();
    if (settings) setCurrency(settings.currency as CurrencyCode);

    const { data } = await supabase
      .from("products")
      .select("*, categories(name, color)")
      .order("stock_quantity", { ascending: true });

    if (data) {
      const lowStock = data.filter(
        (p: any) => p.stock_quantity <= (p.min_stock_level || 10)
      );
      setProducts(lowStock);
    }
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
              Alertes de stock faible
            </h1>
            <p className="text-sm text-muted-foreground">
              Produits nécessitant un réapprovisionnement
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-12 h-12 mx-auto text-primary mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Tous les stocks sont à niveau !
              </p>
              <p className="text-muted-foreground">
                Aucun produit ne nécessite de réapprovisionnement pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">
                      {products.length} produit{products.length > 1 ? "s" : ""} en stock faible
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ces produits nécessitent un réapprovisionnement urgent
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const stockPercentage = (product.stock_quantity / (product.min_stock_level || 10)) * 100;
                const isCritical = stockPercentage <= 50;

                return (
                  <Card
                    key={product.id}
                    className={`border-2 hover:shadow-lg transition-shadow ${
                      isCritical ? "border-destructive" : "border-orange-500"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-2 flex items-center gap-2">
                            <AlertTriangle
                              className={`w-5 h-5 ${
                                isCritical ? "text-destructive" : "text-orange-500"
                              }`}
                            />
                            {product.name}
                          </CardTitle>
                          {product.categories && (
                            <Badge
                              className="mt-2"
                              style={{ backgroundColor: product.categories.color }}
                            >
                              {product.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Stock actuel</span>
                        <Badge variant={isCritical ? "destructive" : "secondary"} className="text-base">
                          {product.stock_quantity}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Seuil minimum</span>
                        <span className="text-sm font-medium">{product.min_stock_level || 10}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prix de vente</span>
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(Number(product.price), currency)}
                        </span>
                      </div>
                      {product.cost_price && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Prix d'achat</span>
                          <span className="text-sm">
                            {formatCurrency(Number(product.cost_price), currency)}
                          </span>
                        </div>
                      )}
                      <div className="pt-2">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCritical ? "bg-destructive" : "bg-orange-500"
                            }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {stockPercentage.toFixed(0)}% du stock minimum
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LowStock;
