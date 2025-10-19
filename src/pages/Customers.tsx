import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, CreditCard, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { customerSchema } from "@/lib/validations";
import { format } from "date-fns";

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [creditSales, setCreditSales] = useState<any[]>([]);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: 0,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadCustomers();
    loadSettings();
    loadCreditSales();
  }, [navigate]);

  const loadSettings = async () => {
    const { data } = await supabase.from("store_settings").select("*").single();
    if (data) setCurrency(data.currency as CurrencyCode);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name");
    if (data) setCustomers(data);
  };

  const loadCreditSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select(`
        *,
        customers:customer_id (
          id,
          name,
          current_credit
        )
      `)
      .in("payment_status", ["credit", "partial"])
      .order("created_at", { ascending: false });
    if (data) setCreditSales(data);
  };

  const loadCustomerDetails = async (customerId: string) => {
    // Load customer info
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customer) setSelectedCustomerDetails(customer);

    // Load all sales for this customer
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (sales) setCustomerSales(sales);

    // Load all payments for this customer
    const { data: payments } = await supabase
      .from("payments")
      .select(`
        *,
        sales:sale_id (
          sale_number,
          total
        )
      `)
      .in("sale_id", sales?.map(s => s.id) || [])
      .order("payment_date", { ascending: false });

    if (payments) setCustomerPayments(payments);
  };

  const handlePayment = async () => {
    if (!selectedSale || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedSale.amount_remaining) {
      toast.error("Montant invalide");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newAmountPaid = selectedSale.amount_paid + amount;
    const newAmountRemaining = selectedSale.amount_remaining - amount;
    const newStatus = newAmountRemaining === 0 ? "completed" : "partial";

    // Get current customer credit
    const { data: customerData } = await supabase
      .from("customers")
      .select("current_credit")
      .eq("id", selectedSale.customer_id)
      .single();

    if (!customerData) {
      toast.error("Client introuvable");
      return;
    }

    // Update sale
    const { error: saleError } = await supabase
      .from("sales")
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        payment_status: newStatus,
      })
      .eq("id", selectedSale.id);

    if (saleError) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    // Update customer credit
    const { error: customerError } = await supabase
      .from("customers")
      .update({
        current_credit: customerData.current_credit - amount,
      })
      .eq("id", selectedSale.customer_id);

    if (customerError) {
      toast.error("Erreur lors de la mise à jour du crédit");
      return;
    }

    // Record payment
    await supabase.from("payments").insert({
      sale_id: selectedSale.id,
      amount: amount,
      payment_method: "cash",
      created_by: user.id,
    });

    toast.success("Paiement enregistré avec succès");
    setIsPaymentDialogOpen(false);
    setPaymentAmount("");
    setSelectedSale(null);
    loadCreditSales();
    loadCustomers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utilisateur non connecté");
        return;
      }

      // Validate form data
      const validationResult = customerSchema.safeParse(formData);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({
            name: validationResult.data.name,
            phone: validationResult.data.phone || null,
            email: validationResult.data.email || null,
            address: validationResult.data.address || null,
            credit_limit: validationResult.data.credit_limit,
          })
          .eq("id", editingCustomer.id);
        
        if (error) throw error;
        toast.success("Client modifié avec succès");
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([{
            name: validationResult.data.name,
            phone: validationResult.data.phone || null,
            email: validationResult.data.email || null,
            address: validationResult.data.address || null,
            credit_limit: validationResult.data.credit_limit,
            user_id: user.id,
          }]);
        
        if (error) throw error;
        toast.success("Client ajouté avec succès");
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", email: "", address: "", credit_limit: 0 });
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      credit_limit: customer.credit_limit || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Client supprimé avec succès");
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gestion des Clients
            </h1>
          </div>
          <Button onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: "", phone: "", email: "", address: "", credit_limit: 0 });
            setIsDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Client
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="clients">
              <CreditCard className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="credits">
              <Wallet className="w-4 h-4 mr-2" />
              Gestion des Crédits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Liste des clients</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Crédit actuel</TableHead>
                      <TableHead className="text-right">Limite crédit</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || "-"}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={customer.current_credit > 0 ? "destructive" : "secondary"}>
                            {formatCurrency(customer.current_credit || 0, currency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.credit_limit || 0, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => {
                                loadCustomerDetails(customer.id);
                                setIsDetailsDialogOpen(true);
                              }}
                              title="Voir l'historique"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventes à crédit en attente</CardTitle>
              </CardHeader>
              <CardContent>
                {creditSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune vente à crédit en attente</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Vente</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Payé</TableHead>
                        <TableHead className="text-right">Reste</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.sale_number}</TableCell>
                          <TableCell>{sale.customers?.name || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3" />
                              {format(new Date(sale.created_at), "dd/MM/yyyy")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(sale.total, currency)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(sale.amount_paid, currency)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {formatCurrency(sale.amount_remaining, currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={sale.payment_status === "credit" ? "destructive" : "secondary"}>
                              {sale.payment_status === "credit" ? "Crédit" : "Partiel"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedSale(sale);
                                setPaymentAmount("");
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              <Wallet className="w-4 h-4 mr-1" />
                              Encaisser
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Limite de crédit
              </Label>
              <Input
                id="credit_limit"
                type="number"
                min="0"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                {editingCustomer ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vente:</span>
                  <span className="font-medium">{selectedSale.sale_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedSale.customers?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="font-medium">{formatCurrency(selectedSale.total, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Déjà payé:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedSale.amount_paid, currency)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Reste à payer:</span>
                  <span className="font-bold text-lg text-destructive">
                    {formatCurrency(selectedSale.amount_remaining, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Montant à encaisser</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={selectedSale.amount_remaining}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Entrer le montant"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique du client</DialogTitle>
          </DialogHeader>

          {selectedCustomerDetails && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-bold text-lg mb-3">{selectedCustomerDetails.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Téléphone:</span>
                    <p className="font-medium">{selectedCustomerDetails.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedCustomerDetails.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Crédit actuel:</span>
                    <p className="font-bold text-lg text-destructive">
                      {formatCurrency(selectedCustomerDetails.current_credit || 0, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Total des achats:</span>
                    <p className="font-bold text-lg text-green-600">
                      {formatCurrency(selectedCustomerDetails.total_purchases || 0, currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Historique des paiements
                </h4>
                {customerPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucun paiement enregistré</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>N° Vente</TableHead>
                          <TableHead className="text-right">Montant payé</TableHead>
                          <TableHead>Méthode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="w-3 h-3" />
                                {format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm")}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.sales?.sale_number || "N/A"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(payment.amount, currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.payment_method}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Sales History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Historique des ventes
                </h4>
                {customerSales.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucune vente</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>N° Vente</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Payé</TableHead>
                          <TableHead className="text-right">Reste</TableHead>
                          <TableHead className="text-center">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="w-3 h-3" />
                                {format(new Date(sale.created_at), "dd/MM/yyyy")}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{sale.sale_number}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(sale.total, currency)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(sale.amount_paid, currency)}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-medium">
                              {formatCurrency(sale.amount_remaining, currency)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  sale.payment_status === "completed"
                                    ? "secondary"
                                    : sale.payment_status === "credit"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {sale.payment_status === "completed"
                                  ? "Payé"
                                  : sale.payment_status === "credit"
                                  ? "Crédit"
                                  : "Partiel"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsDetailsDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;