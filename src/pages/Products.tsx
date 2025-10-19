import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Search, Package, AlertTriangle, Trash2, Boxes, Building2, Phone, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { productSchema, supplierSchema } from "@/lib/validations";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
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
    tax_rate: "18",
  });
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
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
    const [productsRes, categoriesRes, settingsRes, suppliersRes] = await Promise.all([
      supabase.from("products").select("*, categories(name, color)").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("store_settings").select("currency").single(),
      supabase.from("suppliers").select("*").order("name"),
    ]);

    if (productsRes.data) {
      setProducts(productsRes.data);
      const lowStock = productsRes.data.filter(
        (p: any) => p.stock_quantity <= (p.min_stock_level || 10)
      );
      setLowStockProducts(lowStock);
    }
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) setCurrency(settingsRes.data.currency as CurrencyCode);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    // Validate form data
    const validationResult = productSchema.safeParse(formData);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { error } = await supabase.from("products").insert({
      name: validationResult.data.name,
      description: validationResult.data.description || null,
      category_id: validationResult.data.category_id || null,
      price: parseFloat(validationResult.data.price),
      cost_price: validationResult.data.cost_price ? parseFloat(validationResult.data.cost_price) : null,
      stock_quantity: parseInt(validationResult.data.stock_quantity),
      min_stock_level: parseInt(validationResult.data.min_stock_level),
      barcode: validationResult.data.barcode || null,
      sku: validationResult.data.sku || null,
      tax_rate: parseFloat(validationResult.data.tax_rate),
      user_id: user.id,
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
      tax_rate: "18",
    });
    loadData();
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" ?`)) {
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      toast.error("Erreur lors de la suppression du produit");
      return;
    }

    toast.success("Produit supprimé avec succès");
    loadData();
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    const validationResult = supplierSchema.safeParse(supplierFormData);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { error } = await supabase.from("suppliers").insert([{
      name: validationResult.data.name,
      contact_person: validationResult.data.contact_person || null,
      phone: validationResult.data.phone || null,
      email: validationResult.data.email || null,
      address: validationResult.data.address || null,
      notes: validationResult.data.notes || null,
      user_id: user.id,
    }]);

    if (error) {
      toast.error("Erreur lors de l'ajout du fournisseur");
    } else {
      toast.success("Fournisseur ajouté avec succès");
      setIsSupplierDialogOpen(false);
      setSupplierFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
      loadData();
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) return;

    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Fournisseur supprimé");
      loadData();
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Gestion des Produits
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="low-stock">Alertes de Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
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
                    <Label>Catégorie (optionnel)</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sans catégorie" />
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
                  <div className="space-y-2">
                    <Label>TVA (%)</Label>
                    <Input
                      type="number"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                      step="0.01"
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
                    <span className="text-sm text-muted-foreground">Prix HT</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(Number(product.price), currency as any)}
                    </span>
                  </div>
                  {product.tax_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">TVA</span>
                      <span className="text-sm font-medium">{product.tax_rate}%</span>
                    </div>
                  )}
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
                  <div className="pt-2 border-t flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/stock-movements?product=${product.id}`)}
                      className="flex-1"
                    >
                      <Boxes className="w-4 h-4 mr-1" />
                      Stock
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id, product.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un fournisseur
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouveau fournisseur</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSupplierSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="supplier-name">Nom du fournisseur *</Label>
                      <Input
                        id="supplier-name"
                        value={supplierFormData.name}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_person">Personne de contact</Label>
                      <Input
                        id="contact_person"
                        value={supplierFormData.contact_person}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-phone">Téléphone</Label>
                      <Input
                        id="supplier-phone"
                        type="tel"
                        value={supplierFormData.phone}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-email">Email</Label>
                      <Input
                        id="supplier-email"
                        type="email"
                        value={supplierFormData.email}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-address">Adresse</Label>
                      <Textarea
                        id="supplier-address"
                        value={supplierFormData.address}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier-notes">Notes</Label>
                      <Textarea
                        id="supplier-notes"
                        value={supplierFormData.notes}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <Button type="submit" className="w-full">Ajouter</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {suppliers.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun fournisseur enregistré</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {supplier.name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supplier.contact_person && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <p className="text-sm text-muted-foreground mt-2">{supplier.address}</p>
                      )}
                      {supplier.notes && (
                        <p className="text-sm text-muted-foreground italic mt-2">{supplier.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="low-stock" className="space-y-4">
            {lowStockProducts.length === 0 ? (
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
                          {lowStockProducts.length} produit{lowStockProducts.length > 1 ? "s" : ""} en stock faible
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ces produits nécessitent un réapprovisionnement urgent
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockProducts.map((product) => {
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Products;