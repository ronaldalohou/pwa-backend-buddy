import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const StockMovements = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("product");

  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: productFilter || "",
    movement_type: "in",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadData();
  }, [navigate, productFilter]);

  const loadData = async () => {
    const movementsQuery = supabase
      .from("stock_movements")
      .select("*, products(name)")
      .order("created_at", { ascending: false });

    if (productFilter) {
      movementsQuery.eq("product_id", productFilter);
    }

    const [movementsRes, productsRes] = await Promise.all([
      movementsQuery,
      supabase.from("products").select("id, name, stock_quantity").order("name"),
    ]);

    if (movementsRes.data) setMovements(movementsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    const quantity = parseInt(formData.quantity);
    const movement = {
      product_id: formData.product_id,
      movement_type: formData.movement_type,
      quantity: formData.movement_type === "out" ? -quantity : quantity,
      notes: formData.notes || null,
      user_id: user.id,
    };

    const { error } = await supabase.from("stock_movements").insert(movement);

    if (error) {
      toast.error("Erreur lors de l'enregistrement du mouvement");
      return;
    }

    // Mettre à jour le stock du produit
    const product = products.find(p => p.id === formData.product_id);
    if (product) {
      const newStock = formData.movement_type === "out" 
        ? product.stock_quantity - quantity 
        : product.stock_quantity + quantity;

      await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", formData.product_id);
    }

    toast.success("Mouvement de stock enregistré !");
    setIsDialogOpen(false);
    setFormData({
      product_id: productFilter || "",
      movement_type: "in",
      quantity: "",
      notes: "",
    });
    loadData();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Mouvements de Stock
            </h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Mouvement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer un mouvement de stock</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit *</Label>
                  <Select
                    required
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stock: {product.stock_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de mouvement *</Label>
                  <Select
                    required
                    value={formData.movement_type}
                    onValueChange={(value) => setFormData({ ...formData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrée (Réapprovisionnement)</SelectItem>
                      <SelectItem value="out">Sortie (Ajustement/Perte)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantité *</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Raison du mouvement..."
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary">
                  Enregistrer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {movements.map((movement) => (
            <Card key={movement.id} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      movement.movement_type === "in" 
                        ? "bg-secondary/10" 
                        : movement.movement_type === "out"
                        ? "bg-destructive/10"
                        : "bg-muted"
                    }`}>
                      {movement.movement_type === "in" ? (
                        <TrendingUp className="w-5 h-5 text-secondary" />
                      ) : movement.movement_type === "out" ? (
                        <TrendingDown className="w-5 h-5 text-destructive" />
                      ) : (
                        <Package className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{movement.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(movement.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={movement.quantity > 0 ? "secondary" : "destructive"}>
                      {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </Badge>
                    {movement.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {movements.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun mouvement de stock enregistré
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
