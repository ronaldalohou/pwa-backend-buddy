import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Loader2, User, Building2, Phone, FileText, Mail, Calendar, CreditCard, ArrowLeft, Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { profileUpdateSchema } from "@/lib/validations";

const Settings = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [ifu, setIfu] = useState("");
  const [email, setEmail] = useState("");
  const { subscription, loading: subLoading, getDaysRemaining } = useSubscription();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setBusinessName(data.business_name || "");
        setPhone(data.phone || "");
        setIfu(data.ifu || "");
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      const validationResult = profileUpdateSchema.safeParse({
        fullName,
        businessName,
        phone,
        ifu,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validationResult.data.fullName,
          business_name: validationResult.data.businessName,
          phone: validationResult.data.phone,
          ifu: validationResult.data.ifu || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profil mis à jour avec succès !");
      
      // Refresh profile data
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
  };

  const getSubscriptionBadge = () => {
    if (!subscription) return null;
    
    const badgeConfig = {
      trial: { label: "Essai gratuit", variant: "default" as const },
      active: { label: "Actif", variant: "default" as const },
      expired: { label: "Expiré", variant: "destructive" as const },
      cancelled: { label: "Annulé", variant: "secondary" as const },
    };
    
    const config = badgeConfig[subscription.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hidden md:flex">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Paramètres
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Gérez vos informations personnelles et votre compte
            </p>
          </div>
        </div>
      </header>
      
      <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Abonnement
              </CardTitle>
              {getSubscriptionBadge()}
            </div>
            <CardDescription>
              Statut et détails de votre abonnement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            ) : subscription ? (
              <>
                {subscription.is_trial && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✨</span>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">
                        Période d'essai gratuite de 30 jours !
                      </p>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Profitez de toutes les fonctionnalités gratuitement pendant votre période d'essai.
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {subscription.status === "expired" ? "Expiré le" : "Expire le"} :{" "}
                  </span>
                  <span className="font-medium">
                    {subscription.end_date 
                      ? new Date(subscription.end_date).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </span>
                </div>
                
                {getDaysRemaining !== null && getDaysRemaining > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-primary">
                      ⏰ {getDaysRemaining} jour{getDaysRemaining > 1 ? "s" : ""} restant{getDaysRemaining > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                
                {subscription.status === "expired" && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive">
                      Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser l'application.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun abonnement trouvé
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations du profil
            </CardTitle>
            <CardDescription>
              Mettez à jour vos informations personnelles et professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="border-2 bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom complet
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nom du commerce/entreprise
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Boutique Jean"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Numéro de téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+229 XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifu" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  IFU (optionnel)
                </Label>
                <Input
                  id="ifu"
                  type="text"
                  placeholder="3202300000000"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                  className="border-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les modifications
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                >
                  Se déconnecter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;