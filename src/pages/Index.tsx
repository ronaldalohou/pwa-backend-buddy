import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Zap, Users, Globe, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Fetch subscription plans
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (data) setPlans(data);
    };
    fetchPlans();
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
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-secondary/5">
      {/* Hero Section */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="africaisse" className="w-10 h-10" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:block">
              africaisse
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="sm:size-default" onClick={() => navigate("/auth")}>
              Connexion
            </Button>
            <Button 
              size="sm"
              className="sm:size-default bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              onClick={() => navigate("/auth?signup=true")}
            >
              S'inscrire
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-8">
            <img 
              src="/logo.png" 
              alt="africaisse Logo" 
              className="mx-auto w-32 h-32 animate-pulse"
            />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              Gérez votre commerce avec simplicité
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Solution de point de vente moderne, conçue pour les commerces béninois et africains. 
              Multi-devises, Mobile Money, et gestion complète de votre activité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => navigate("/auth?signup=true")}
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
                Se connecter
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

        {/* Pricing */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-accent text-accent-foreground">
              1er mois gratuit
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Choisissez votre plan</h2>
            <p className="text-muted-foreground text-lg">
              Commencez gratuitement et évoluez selon vos besoins
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const features = plan.features || [];
              const isFree = plan.price === 0;
              return (
                <Card 
                  key={plan.id} 
                  className={`relative border-2 hover:shadow-2xl transition-all ${
                    index === 1 ? 'scale-105 border-primary' : ''
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground">
                        Populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-4xl font-bold">
                        {isFree ? "Gratuit" : `${plan.price.toLocaleString()} FCFA`}
                      </span>
                      {!isFree && <span className="text-muted-foreground">/{plan.duration_days} jours</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={() => navigate("/auth?signup=true")}
                      className={`w-full ${
                        index === 1 
                          ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' 
                          : ''
                      }`}
                      variant={index === 1 ? "default" : "outline"}
                    >
                      Commencer
                    </Button>
                    <ul className="space-y-3">
                      {features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="border-2 bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-6 sm:p-12 text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Prêt à démarrer ?</h2>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Rejoignez des centaines de commerces qui utilisent déjà africaisse 
                pour gérer leurs ventes au quotidien.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate("/auth?signup=true")}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6"
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
          <p>© 2025 africaisse. Conçu pour l'Afrique, par des Africains.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;