import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, TrendingUp, Shield, Zap, Users, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Gestion complète",
      description: "Produits, stocks, ventes et clients en un seul endroit"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-devises",
      description: "Support FCFA, Naira, Cedi, Dirham et plus"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Mobile Money",
      description: "MTN, Moov, Orange Money intégrés"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Crédit clients",
      description: "Gérez facilement les ventes à crédit"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Sécurisé",
      description: "Vos données protégées et sauvegardées"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Interface moderne",
      description: "Design intuitif et adapté aux écrans tactiles"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-secondary/5">
      {/* Hero Section */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AfriCaisse
            </span>
          </div>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Se connecter
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="mx-auto bg-gradient-to-br from-primary to-secondary p-8 rounded-3xl w-32 h-32 flex items-center justify-center shadow-2xl animate-pulse">
              <ShoppingBag className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              Gérez votre commerce avec simplicité
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Solution de point de vente moderne, conçue pour les commerces africains. 
              Multi-devises, Mobile Money, et gestion complète de votre activité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-lg px-8 py-6"
              >
                Commencer gratuitement
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="border-2 text-lg px-8 py-6"
              >
                Voir la démo
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground text-lg">
              Une solution complète pour gérer votre commerce au quotidien
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:shadow-xl transition-all hover:scale-105">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="border-2 bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl font-bold">Prêt à démarrer ?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Rejoignez des centaines de commerces qui utilisent déjà AfriCaisse 
                pour gérer leurs ventes au quotidien.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-lg px-8 py-6"
              >
                Créer mon compte maintenant
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 AfriCaisse. Conçu pour l'Afrique, par des Africains.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
