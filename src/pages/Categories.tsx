import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "📦",
    color: "#3b82f6",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadCategories();
  }, [navigate]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Le nom de la catégorie est requis");
      return;
    }

    const { error } = await supabase.from("categories").insert([formData]);

    if (error) {
      toast.error("Erreur lors de l'ajout de la catégorie");
    } else {
      toast.success("Catégorie ajoutée avec succès");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        icon: "📦",
        color: "#3b82f6",
      });
      loadCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Catégorie supprimée");
      loadCategories();
    }
  };

  const commonIcons = ["📦", "🍔", "☕", "🥤", "🍕", "🛒", "💊", "📱", "👕", "🎮", "📚", "🏠"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Catégories de produits
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la catégorie *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                          formData.icon === icon ? "border-primary bg-primary/10" : "border-border"
                        }`}
                        onClick={() => setFormData({ ...formData, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="color">Couleur</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Ajouter</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                      onClick={() => handleDelete(category.id)}
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
      </main>
    </div>
  );
};

export default Categories;
