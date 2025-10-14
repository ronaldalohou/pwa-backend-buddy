import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Package, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/currency";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState<string>("XOF");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock_level: "10",
    barcode: "",
    sku: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadData();
  }, [navigate]);

  const loadData = async () => {
    const [productsRes, categoriesRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*, categories(name, color)").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("store_settings").select("currency").single(),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) setCurrency(settingsRes.data.currency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("products").insert({
      ...formData,
      price: parseFloat(formData.price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      stock_quantity: parseInt(formData.stock_quantity),
      min_stock_level: parseInt(formData.min_stock_level),
    });

    if (error) {
      toast.error("Erreur lors de l'ajout du produit");
      return;
    }

    toast.success("Produit ajouté avec succès !");
    setIsDialogOpen(false);
    setFormData({
      name: "",
      description: "",
      category_id: "",
      price: "",
      cost_price: "",
      stock_quantity: "",
      min_stock_level: "10",
      barcode: "",
      sku: "",
    });
    loadData();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gestion des Produits
            </h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un produit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nom du produit *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie *</Label>
                    <Select
                      required
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de vente *</Label>
                    <Input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de revient</Label>
                    <Input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock initial *</Label>
                    <Input
                      type="number"
                      required
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Seuil d'alerte</Label>
                    <Input
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code-barres</Label>
                    <Input
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary">
                  Ajouter le produit
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock_quantity < product.min_stock_level;
            const margin = product.cost_price
              ? ((product.price - product.cost_price) / product.price * 100).toFixed(1)
              : null;

            return (
              <Card key={product.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                      {product.categories && (
                        <Badge
                          className="mt-2"
                          style={{ backgroundColor: product.categories.color }}
                        >
                          {product.categories.name}
                        </Badge>
                      )}
                    </div>
                    {isLowStock && (
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 ml-2" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Prix</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(Number(product.price), currency as any)}
                    </span>
                  </div>
                  {margin && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Marge</span>
                      <span className="text-sm font-medium text-secondary">{margin}%</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stock</span>
                    <Badge variant={isLowStock ? "destructive" : "secondary"}>
                      <Package className="w-3 h-3 mr-1" />
                      {product.stock_quantity}
                    </Badge>
                  </div>
                  {product.sku && (
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>SKU:</span>
                      <span>{product.sku}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun produit trouvé" : "Aucun produit. Commencez par en ajouter un !"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Products;