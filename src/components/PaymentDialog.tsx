import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PaymentMethod, PAYMENT_METHODS, formatCurrency, CurrencyCode } from "@/utils/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
            <div className="space-y-2">
              <Label>Client (obligatoire pour crédit)</Label>
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