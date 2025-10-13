import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="text-center space-y-8 p-8 max-w-2xl">
        <div className="mx-auto bg-gradient-to-br from-primary to-secondary p-6 rounded-3xl w-24 h-24 flex items-center justify-center shadow-2xl animate-pulse">
          <ShoppingBag className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            AfriCaisse POS
          </h1>
          <p className="text-xl text-muted-foreground">
            Votre solution de point de vente moderne et intuitive
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Gestion simplifiée • Rapports en temps réel • Interface tactile</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-lg px-8 py-6"
          >
            Commencer
          </Button>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-2 text-lg px-8 py-6"
          >
            Se connecter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
