import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

const SubscriptionExpired = () => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
    } else {
      toast.success("Déconnexion réussie");
      navigate("/");
    }
  };

  const handleRenew = () => {
    // Cette fonction sera liée au système de paiement (Stripe, etc.)
    toast.info("Le système de paiement sera bientôt disponible");
    // Pour l'instant, rediriger vers la page d'accueil
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 via-background to-destructive/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-destructive/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto bg-destructive/10 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-destructive">
              Abonnement Expiré
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {subscription?.is_trial 
                ? "Votre période d'essai de 30 jours est terminée"
                : "Votre abonnement a expiré"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              Vos données sont <strong className="text-foreground">sécurisées et sauvegardées</strong>.
              Elles seront accessibles dès le renouvellement de votre abonnement.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleRenew}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity gap-2"
              size="lg"
            >
              <CreditCard className="w-5 h-5" />
              Renouveler mon abonnement
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Pour toute question, contactez notre support
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpired;
