import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PaymentMethod, PAYMENT_METHODS, formatCurrency, CurrencyCode } from "@/utils/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: CurrencyCode;
  onConfirm: (paymentMethod: PaymentMethod, customerId?: string, amountPaid?: number) => void;
  customers: any[];
}

export const PaymentDialog = ({ open, onOpenChange, total, currency, onConfirm, customers }: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>(total.toString());
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout du client");
      return;
    }

    toast.success("Client ajouté avec succès");
    setSelectedCustomer(data.id);
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    
    // Refresh customers list
    window.location.reload();
  };

  const handleConfirm = () => {
    const paid = parseFloat(amountPaid) || 0;
    onConfirm(paymentMethod, selectedCustomer || undefined, paid);
  };

  const change = parseFloat(amountPaid) - total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement de la vente</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total */}
          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Montant total</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total, currency)}</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Méthode de paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                <div key={key} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex-1 cursor-pointer flex items-center gap-2">
                    <span className="text-xl">{method.icon}</span>
                    <span>{method.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Customer selection for credit */}
          {paymentMethod === "credit" && (
            <div className="space-y-3">
              <Label>Client (obligatoire pour crédit)</Label>
              {!showNewCustomerForm ? (
                <>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - Crédit: {formatCurrency(customer.current_credit, currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowNewCustomerForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un nouveau client
                  </Button>
                </>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Nom du client *</Label>
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone (optionnel)</Label>
                    <Input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Ex: +229 12 34 56 78"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowNewCustomerForm(false);
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      onClick={handleAddCustomer}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount paid for cash */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label>Montant reçu</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                step="100"
                min={total}
              />
              {change >= 0 && (
                <div className="flex justify-between items-center p-2 bg-secondary/20 rounded">
                  <span className="text-sm font-medium">Monnaie à rendre:</span>
                  <span className="text-lg font-bold text-secondary">{formatCurrency(change, currency)}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-primary to-secondary" 
              onClick={handleConfirm}
              disabled={paymentMethod === "credit" && !selectedCustomer}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};