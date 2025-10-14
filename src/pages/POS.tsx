import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Trash2, Plus, Minus, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/PaymentDialog";
import { formatCurrency, PaymentMethod, CurrencyCode } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdf";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const POS = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadCategories();
    loadProducts();
    loadCustomers();
    loadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    const { data } = await supabase.from("store_settings").select("*").single();
    if (data) {
      setStoreSettings(data);
      setCurrency(data.currency as CurrencyCode);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from("customers").select("*").order("name");
    if (data) setCustomers(data);
  };

  const loadProducts = async () => {
    let query = supabase.from("products").select("*").eq("is_active", true);
    
    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    
    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query.order("name");
    if (data) setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error("Stock insuffisant");
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock_quantity <= 0) {
        toast.error("Produit en rupture de stock");
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    const cartItem = cart.find(item => item.id === id);
    
    if (!product || !cartItem) return;

    const newQuantity = cartItem.quantity + delta;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
      return;
    }

    if (newQuantity > product.stock_quantity) {
      toast.error("Stock insuffisant");
      return;
    }

    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePaymentConfirm = async (paymentMethod: PaymentMethod, customerId?: string, amountPaid?: number) => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    setIsPaymentDialogOpen(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const saleNumber = `SALE-${Date.now().toString().slice(-6)}`;
      const isCredit = paymentMethod === "credit";
      const paid = amountPaid || (isCredit ? 0 : total);
      const remaining = total - paid;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          cashier_id: user.id,
          customer_id: customerId || null,
          subtotal: total,
          total: total,
          payment_method: paymentMethod,
          payment_status: isCredit ? "credit" : (remaining > 0 ? "partial" : "completed"),
          amount_paid: paid,
          amount_remaining: remaining,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.id);
        }
      }

      // Generate PDF
      const customer = customers.find(c => c.id === customerId);
      const pdf = generateInvoicePDF({
        saleNumber,
        date: new Date(),
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        currency,
        storeName: storeSettings?.store_name || "Mon Commerce",
        storeAddress: storeSettings?.address,
        storePhone: storeSettings?.phone,
        customerName: customer?.name,
      });

      pdf.save(`Facture_${saleNumber}.pdf`);

      toast.success(`Vente ${saleNumber} enregistrée avec succès ! Facture PDF générée.`);
      setCart([]);
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la vente");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Point de Vente
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
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

          <ScrollArea className="h-20">
            <div className="flex gap-2 pb-4">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(null)}
              >
                Tous
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2"
                onClick={() => addToCart(product)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">{formatCurrency(Number(product.price), currency)}</span>
                    <Badge variant={product.stock_quantity > 10 ? "secondary" : "destructive"}>
                      {product.stock_quantity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Panier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[400px]">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Panier vide</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price, currency)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total, currency)}</span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  size="lg"
                  onClick={() => setIsPaymentDialogOpen(true)}
                  disabled={cart.length === 0 || isProcessing}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isProcessing ? "Traitement..." : "Procéder au paiement"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        total={total}
        currency={currency}
        customers={customers}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
};

export default POS;
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadCategories();
    loadProducts();
  }, [navigate]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const loadProducts = async () => {
    let query = supabase.from("products").select("*").eq("is_active", true);
    
    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    
    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query.order("name");
    if (data) setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error("Stock insuffisant");
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock_quantity <= 0) {
        toast.error("Produit en rupture de stock");
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    const cartItem = cart.find(item => item.id === id);
    
    if (!product || !cartItem) return;

    const newQuantity = cartItem.quantity + delta;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
      return;
    }

    if (newQuantity > product.stock_quantity) {
      toast.error("Stock insuffisant");
      return;
    }

    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Non authentifié");

      const saleNumber = `SALE-${Date.now().toString().slice(-6)}`;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          cashier_id: user.id,
          subtotal: total,
          total: total,
          payment_method: "cash",
          payment_status: "completed",
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.id);
        }
      }

      toast.success(`Vente ${saleNumber} enregistrée avec succès !`);
      setCart([]);
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la vente");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Point de Vente
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
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

          <ScrollArea className="h-20">
            <div className="flex gap-2 pb-4">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(null)}
              >
                Tous
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2"
                onClick={() => addToCart(product)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">{product.price} FCFA</span>
                    <Badge variant={product.stock_quantity > 10 ? "secondary" : "destructive"}>
                      {product.stock_quantity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Panier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[400px]">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Panier vide</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.price} FCFA × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{total.toFixed(2)} FCFA</span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isProcessing}
                >
                  {isProcessing ? "Traitement..." : "Valider la vente"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POS;