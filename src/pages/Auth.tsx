import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { signUpSchema, signInSchema } from "@/lib/validations";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [ifu, setIfu] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (session && !isPasswordRecovery) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isPasswordRecovery) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordRecovery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate signup data
        const validationResult = signUpSchema.safeParse({
          email,
          password,
          confirmPassword,
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

        const { data, error } = await supabase.auth.signUp({
          email: validationResult.data.email,
          password: validationResult.data.password,
          options: {
            data: {
              full_name: validationResult.data.fullName,
              business_name: validationResult.data.businessName,
              phone: validationResult.data.phone,
              ifu: validationResult.data.ifu || null,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;
        
        if (data.user) {
          // Create a trial subscription for new users
          const startDate = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 30);

          await supabase.from("subscriptions").insert({
            user_id: data.user.id,
            status: "trial",
            is_trial: true,
            start_date: startDate.toISOString(),
            end_date: trialEndDate.toISOString(),
          });
        }
        
        if (data.user && !data.session) {
          // Email de confirmation envoyé (pas encore confirmé)
          toast.success(
            "Compte créé avec un essai gratuit de 30 jours ! Vérifiez votre email (et le dossier spam) pour confirmer votre inscription.",
            { duration: 8000 }
          );
          setIsSignUp(false);
          return;
        }
        
        if (data.user) {

          // Send welcome email in French
          try {
            await supabase.functions.invoke("send-welcome-email", {
              body: {
                email: validationResult.data.email,
                fullName: validationResult.data.fullName,
                businessName: validationResult.data.businessName,
              },
            });
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // Don't block registration if email fails
          }
          
          toast.success("Compte créé ! Vous pouvez maintenant vous connecter.");
          setIsSignUp(false);
        }
      } else {
        // Validate signin data
        const validationResult = signInSchema.safeParse({
          email,
          password,
        });

        if (!validationResult.success) {
          const firstError = validationResult.error.errors[0];
          toast.error(firstError.message);
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: validationResult.data.email,
          password: validationResult.data.password,
        });

        if (error) throw error;
        toast.success("Connexion réussie !");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email) {
        toast.error("Veuillez entrer votre adresse email");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success(
        "Email de réinitialisation envoyé ! Vérifiez votre boîte de réception (et le dossier spam).",
        { duration: 8000 }
      );
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!newPassword || newPassword.length < 6) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmNewPassword) {
        toast.error("Les mots de passe ne correspondent pas");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès !");
      setIsPasswordRecovery(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 relative">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à l'accueil
      </Button>
      
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img src="/logo.png" alt="africaisse" className="w-16 h-16 mx-auto" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Africaisse
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isPasswordRecovery
                ? "Créer un nouveau mot de passe"
                : isForgotPassword 
                ? "Réinitialiser votre mot de passe" 
                : isSignUp 
                ? "Créer un nouveau compte - 30 jours gratuits" 
                : "Connectez-vous à votre compte"}
            </CardDescription>
            {isSignUp && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-center">
                  📧 Un email de confirmation sera envoyé<br />
                  <strong>Pensez à vérifier vos spams</strong> si vous ne le recevez pas
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPasswordRecovery ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="border-2 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirmer le nouveau mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="border-2 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour le mot de passe
              </Button>
            </form>
          ) : (
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            {!isForgotPassword && isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nom du commerce/entreprise *</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Boutique Jean"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+229 XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifu">IFU</Label>
                  <Input
                    id="ifu"
                    type="text"
                    placeholder="3202300000000"
                    value={ifu}
                    onChange={(e) => setIfu(e.target.value)}
                    className="border-2"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-2"
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-2 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {!isForgotPassword && isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-2 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isForgotPassword 
                ? "Envoyer le lien de réinitialisation" 
                : isSignUp 
                ? "Créer un compte" 
                : "Se connecter"}
            </Button>
          </form>
          )}
          {!isPasswordRecovery && (
          <div className="mt-6 space-y-3 text-center">
            {!isForgotPassword && !isSignUp && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Mot de passe oublié ?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setIsForgotPassword(false);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isForgotPassword
                ? "Retour à la connexion"
                : isSignUp
                ? "Vous avez déjà un compte ? Connectez-vous"
                : "Pas de compte ? Inscrivez-vous"}
            </button>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;