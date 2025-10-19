import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu, ArrowLeft, Plus, Search, Package, AlertTriangle, Trash2, Boxes, Building2, Phone, Mail, User, Tag, TrendingUp, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { productSchema, supplierSchema, categorySchema } from "@/lib/validations";

const Products = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  
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
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    icon: "📦",
    color: "#3b82f6",
  });
  const [movementFormData, setMovementFormData] = useState({
    product_id: "",
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
  }, [navigate]);

  const loadData = async () => {
    const [productsRes, categoriesRes, settingsRes, suppliersRes, movementsRes] = await Promise.all([
      supabase.from("products").select("*, categories(name, color)").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("store_settings").select("currency").single(),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("stock_movements").select("*, products(name)").order("created_at", { ascending: false }),
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
    if (movementsRes.data) setMovements(movementsRes.data);
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

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    const validationResult = categorySchema.safeParse(categoryFormData);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { error } = await supabase.from("categories").insert([{
      name: validationResult.data.name,
      description: validationResult.data.description || null,
      icon: validationResult.data.icon,
      color: validationResult.data.color,
      user_id: user.id,
    }]);

    if (error) {
      toast.error("Erreur lors de l'ajout de la catégorie");
    } else {
      toast.success("Catégorie ajoutée avec succès");
      setIsCategoryDialogOpen(false);
      setCategoryFormData({
        name: "",
        description: "",
        icon: "📦",
        color: "#3b82f6",
      });
      loadData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Catégorie supprimée");
      loadData();
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    const quantity = parseInt(movementFormData.quantity);
    const movement = {
      product_id: movementFormData.product_id,
      movement_type: movementFormData.movement_type,
      quantity: movementFormData.movement_type === "out" ? -quantity : quantity,
      notes: movementFormData.notes || null,
      user_id: user.id,
    };

    const { error } = await supabase.from("stock_movements").insert(movement);

    if (error) {
      toast.error("Erreur lors de l'enregistrement du mouvement");
      return;
    }

    // Mettre à jour le stock du produit
    const product = products.find(p => p.id === movementFormData.product_id);
    if (product) {
      const newStock = movementFormData.movement_type === "out" 
        ? product.stock_quantity - quantity 
        : product.stock_quantity + quantity;

      await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", movementFormData.product_id);
    }

    toast.success("Mouvement de stock enregistré !");
    setIsMovementDialogOpen(false);
    setMovementFormData({
      product_id: "",
      movement_type: "in",
      quantity: "",
      notes: "",
    });
    loadData();
  };

  const commonIcons = ["📦", "🍔", "☕", "🥤", "🍕", "🛒", "💊", "📱", "👕", "🎮", "📚", "🏠"];

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hidden md:flex">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Gestion des Produits
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="movements">Mouvements</TabsTrigger>
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

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une catégorie
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouvelle catégorie</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="category-name">Nom de la catégorie *</Label>
                      <Input
                        id="category-name"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category-description">Description</Label>
                      <Textarea
                        id="category-description"
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Icône</Label>
                      <div className="grid grid-cols-6 gap-2 mt-2">
                        {commonIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={`text-2xl p-2 rounded border-2 hover:scale-110 transition-transform ${
                              categoryFormData.icon === icon ? "border-primary bg-primary/10" : "border-border"
                            }`}
                            onClick={() => setCategoryFormData({ ...categoryFormData, icon })}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category-color">Couleur</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="category-color"
                          type="color"
                          value={categoryFormData.color}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={categoryFormData.color}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Ajouter</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {categories.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune catégorie créée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="border-2 hover:shadow-lg transition-shadow"
                    style={{ borderColor: category.color }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{category.icon}</span>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {category.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
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

          <TabsContent value="movements" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
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
                  <form onSubmit={handleMovementSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Produit *</Label>
                      <Select
                        required
                        value={movementFormData.product_id}
                        onValueChange={(value) => setMovementFormData({ ...movementFormData, product_id: value })}
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
                        value={movementFormData.movement_type}
                        onValueChange={(value) => setMovementFormData({ ...movementFormData, movement_type: value })}
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
                        value={movementFormData.quantity}
                        onChange={(e) => setMovementFormData({ ...movementFormData, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={movementFormData.notes}
                        onChange={(e) => setMovementFormData({ ...movementFormData, notes: e.target.value })}
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