import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Users, TrendingUp, Calendar, Search, RefreshCw, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminUser {
  id: string;
  full_name: string;
  business_name: string;
  phone: string;
  email: string;
  user_created_at: string;
  subscription_status: string;
  is_trial: boolean;
  subscription_start: string;
  subscription_end: string;
  days_remaining: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    trialUsers: 0,
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [renewalDays, setRenewalDays] = useState("30");
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Accès refusé - Administrateur uniquement");
      navigate("/dashboard");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with subscriptions
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Combine data
      const usersData = profiles.map((profile) => {
        const subscription = subscriptions?.find((s) => s.user_id === profile.id);
        const daysRemaining = subscription?.end_date
          ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name || "N/A",
          business_name: profile.business_name || "N/A",
          phone: profile.phone || "N/A",
          email: "Chargement...",
          user_created_at: profile.created_at,
          subscription_status: subscription?.status || "none",
          is_trial: subscription?.is_trial || false,
          subscription_start: subscription?.start_date || "",
          subscription_end: subscription?.end_date || "",
          days_remaining: daysRemaining,
        };
      });

      setUsers(usersData);

      // Calculate stats
      const active = usersData.filter((u) => u.subscription_status === "active" || u.subscription_status === "trial").length;
      const expired = usersData.filter((u) => u.subscription_status === "expired").length;
      const trial = usersData.filter((u) => u.is_trial).length;

      setStats({
        totalUsers: usersData.length,
        activeSubscriptions: active,
        expiredSubscriptions: expired,
        trialUsers: trial,
      });
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (!selectedUser) return;

    setIsRenewing(true);
    try {
      const days = parseInt(renewalDays);
      if (isNaN(days) || days <= 0) {
        toast.error("Nombre de jours invalide");
        return;
      }

      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + days);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          end_date: newEndDate.toISOString(),
          is_trial: false,
        })
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      toast.success(`Abonnement renouvelé pour ${days} jours`);
      setSelectedUser(null);
      setRenewalDays("30");
      loadUsers();
    } catch (error: any) {
      console.error("Error renewing subscription:", error);
      toast.error("Erreur lors du renouvellement");
    } finally {
      setIsRenewing(false);
    }
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    if (status === "expired") {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    if (status === "trial") {
      return <Badge variant="default">Essai ({daysRemaining}j)</Badge>;
    }
    if (status === "active") {
      return <Badge variant="default" className="bg-secondary">Actif ({daysRemaining}j)</Badge>;
    }
    return <Badge variant="secondary">Aucun</Badge>;
  };

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  );

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Administration
            </h1>
            <p className="text-muted-foreground mt-2">Gérez tous les clients et leurs abonnements</p>
          </div>
          <Button onClick={loadUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                Abonnements Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-destructive" />
                Abonnements Expirés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.expiredSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                En Essai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.trialUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des clients</CardTitle>
            <CardDescription>Gérez les abonnements de tous vos clients</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom, commerce ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom complet</TableHead>
                      <TableHead>Commerce</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.business_name}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{new Date(user.user_created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{getStatusBadge(user.subscription_status, user.days_remaining)}</TableCell>
                        <TableCell>
                          {user.subscription_end
                            ? new Date(user.subscription_end).toLocaleDateString("fr-FR")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                              >
                                Renouveler
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Renouveler l'abonnement</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <strong>Client:</strong> {selectedUser?.full_name}
                                  </p>
                                  <p className="text-sm">
                                    <strong>Commerce:</strong> {selectedUser?.business_name}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="days">Nombre de jours</Label>
                                  <Input
                                    id="days"
                                    type="number"
                                    min="1"
                                    value={renewalDays}
                                    onChange={(e) => setRenewalDays(e.target.value)}
                                  />
                                </div>
                                <Button
                                  onClick={handleRenewSubscription}
                                  className="w-full"
                                  disabled={isRenewing}
                                >
                                  {isRenewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Confirmer le renouvellement
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun client trouvé
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
