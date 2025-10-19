import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export interface Subscription {
  status: "trial" | "active" | "expired" | "cancelled";
  is_trial: boolean;
  end_date: string | null;
  plan_id: string | null;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erreur lors de la récupération de l'abonnement:", error);
        setLoading(false);
        return;
      }

      if (sub) {
        // Vérifier si l'abonnement est expiré
        const now = new Date();
        const endDate = sub.end_date ? new Date(sub.end_date) : null;
        
        if (endDate && endDate < now && (sub.status === "trial" || sub.status === "active")) {
          // Mettre à jour le statut à expiré
          await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("user_id", user.id);
          
          setSubscription({ 
            status: "expired" as const,
            is_trial: sub.is_trial,
            end_date: sub.end_date,
            plan_id: sub.plan_id,
          });
        } else {
          setSubscription({
            status: sub.status as "trial" | "active" | "expired" | "cancelled",
            is_trial: sub.is_trial,
            end_date: sub.end_date,
            plan_id: sub.plan_id,
          });
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;
    return subscription.status === "trial" || subscription.status === "active";
  };

  const getDaysRemaining = () => {
    if (!subscription?.end_date) return null;
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return {
    subscription,
    loading,
    isSubscriptionActive: isSubscriptionActive(),
    getDaysRemaining: getDaysRemaining(),
    refetch: checkSubscription,
  };
};
