import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatCurrency, type CurrencyCode } from "@/utils/currency";
import { Plus, Trash2, Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  created_at: string;
}

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    category: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadData(session.user.id);
  };

  const loadData = async (userId: string) => {
    const [settingsRes, expensesRes] = await Promise.all([
      supabase.from("store_settings").select("currency").eq("user_id", userId).single(),
      supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false }),
    ]);

    if (settingsRes.data?.currency) setCurrency(settingsRes.data.currency as CurrencyCode);
    if (expensesRes.data) setExpenses(expensesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.description || !formData.amount) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let receiptUrl = null;

    // Upload receipt if provided
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        toast.error("Erreur lors de l'upload de la preuve");
        return;
      }

      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);
      
      receiptUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category || null,
      receipt_url: receiptUrl,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout de la dépense");
      return;
    }

    toast.success("Dépense ajoutée avec succès");
    setIsDialogOpen(false);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      amount: "",
      category: "",
    });
    setReceiptFile(null);
    loadData(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Dépense supprimée");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) loadData(user.id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Dépenses</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle dépense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Ajouter une dépense</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Achat de fournitures, Loyer, Électricité..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant ({currency}) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie (optionnel)</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Fournitures, Loyer, Salaire..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preuve de dépense (optionnel)</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Image ou PDF (max 5 MB)
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Ajouter</Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Aucune dépense enregistrée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{expense.description}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(expense.date), "dd/MM/yyyy")}</span>
                      {expense.category && (
                        <>
                          <span>•</span>
                          <span>{expense.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-destructive">
                      -{formatCurrency(expense.amount, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(expense.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Expenses;
