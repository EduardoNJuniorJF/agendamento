import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2, Pencil, Trash2, Users, UserCheck, Search, ShieldCheck, Filter } from "lucide-react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Checkbox } from "@/components/ui/checkbox";
import PermissionsMatrix from "@/components/users/PermissionsMatrix";
import UserPermissionsEditor from "@/components/users/UserPermissionsEditor";
import { Lock } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  color: string | null;
  receives_bonus: boolean | null;
  user_id: string | null;
  is_active: boolean | null;
}

interface User {
  id: string;
  username: string | null;
  email: string;
  full_name: string | null;
  role: "admin" | "user" | "financeiro" | "dev";
  sector: string | null;
  agent: Agent | null;
}

export default function UserManagement() {
  const { role, session, user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "user" as "admin" | "user" | "financeiro",
    sector: "" as "Comercial" | "Suporte" | "Desenvolvimento" | "Administrativo" | "Loja" | "",
    isAgent: false,
    agentColor: "#3b82f6",
    receivesBonus: true,
  });

  const [editFormData, setEditFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    role: "user" as "admin" | "user" | "financeiro" | "dev",
    sector: "" as "Comercial" | "Suporte" | "Desenvolvimento" | "Administrativo" | "Loja" | "",
    isAgent: false,
    agentColor: "#3b82f6",
    receivesBonus: true,
  });

  useEffect(() => {
    if (role === "dev") {
      loadUsers();
    }
  }, [role]);

  useRealtimeRefresh(['profiles', 'user_roles', 'agents'], () => { loadUsers(); });

  // DEV only access
  if (role !== "dev") {
    return <Navigate to="/" replace />;
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      const [profilesRes, rolesRes, agentsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, email, full_name, sector"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("agents").select("id, name, color, receives_bonus, user_id, is_active"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (agentsRes.error) throw agentsRes.error;

      const usersWithRoles: User[] =
        profilesRes.data?.map((profile) => {
          const userRole = rolesRes.data?.find((r) => r.user_id === profile.id);
          const agent = agentsRes.data?.find((a) => a.user_id === profile.id) || null;
          return {
            ...profile,
            role: (userRole?.role || "user") as User["role"],
            sector: profile.sector,
            agent,
          };
        }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoadingUsers(false);
    }
  };

  const isDevUser = (user: User) =>
    user.email === "dev@sistema.com" || user.username?.toLowerCase() === "dev";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.fullName || !formData.sector) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: formData,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      toast.success("Usuário criado com sucesso!");
      setFormData({
        username: "", email: "", password: "", fullName: "",
        role: "user", sector: "", isAgent: false, agentColor: "#3b82f6", receivesBonus: true,
      });
      await loadUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || "",
      email: user.email,
      fullName: user.full_name || "",
      role: user.role,
      sector: (user.sector as any) || "",
      isAgent: !!user.agent,
      agentColor: user.agent?.color || "#3b82f6",
      receivesBonus: user.agent?.receives_bonus ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditRoleChange = (value: string) => {
    if (value === "admin" && editFormData.role !== "admin") {
      setPendingRoleChange(value);
      setShowRoleConfirm(true);
    } else {
      setEditFormData({ ...editFormData, role: value as any });
    }
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      setEditFormData({ ...editFormData, role: pendingRoleChange as any });
    }
    setShowRoleConfirm(false);
    setPendingRoleChange(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          userId: editingUser.id,
          username: editFormData.username,
          email: editFormData.email,
          fullName: editFormData.fullName,
          role: editFormData.role,
          sector: editFormData.sector,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      // Handle agent status
      if (editFormData.isAgent && !editingUser.agent) {
        // Create agent
        await supabase.from("agents").insert({
          name: editFormData.fullName || editFormData.username,
          user_id: editingUser.id,
          color: editFormData.agentColor,
          receives_bonus: editFormData.receivesBonus,
          sector: editFormData.sector,
        });
      } else if (editFormData.isAgent && editingUser.agent) {
        // Update agent
        await supabase.from("agents").update({
          color: editFormData.agentColor,
          receives_bonus: editFormData.receivesBonus,
          sector: editFormData.sector,
        }).eq("id", editingUser.agent.id);
      } else if (!editFormData.isAgent && editingUser.agent) {
        // Deactivate agent
        await supabase.from("agents").update({ is_active: false }).eq("id", editingUser.agent.id);
      }

      toast.success("Usuário atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      toast.success("Usuário excluído com sucesso!");
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "admin": return "Administrador";
      case "dev": return "Desenvolvedor";
      case "user": return "Usuário";
      case "financeiro": return "Leitor";
      default: return r;
    }
  };

  const getRoleDescription = (r: string) => {
    switch (r) {
      case "admin": return "Controle total e irrestrito ao sistema";
      case "user": return "Pode alterar Calendário e Dashboard";
      case "financeiro": return "Apenas visualização e impressão";
      default: return "";
    }
  };

  const filteredUsers = users
    .filter((u) => {
      // Hide dev user unless current user is dev
      if (isDevUser(u) && u.id !== currentUser?.id) return false;
      return true;
    })
    .filter((u) => {
      if (sectorFilter !== "all" && u.sector !== sectorFilter) return false;
      return true;
    })
    .filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const nameA = (a.full_name || a.username || a.email).toLowerCase();
      const nameB = (b.full_name || b.username || b.email).toLowerCase();
      return nameA.localeCompare(nameB, "pt-BR");
    });

  const sectors = ["Comercial", "Suporte", "Desenvolvimento", "Administrativo", "Loja"];

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Gestão de Usuários e Acessos
        </h1>
        <p className="text-muted-foreground text-sm">Painel exclusivo do desenvolvedor para gerenciamento completo de usuários e permissões</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1">
            <UserPlus className="h-4 w-4" />
            Criar Usuário
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1">
            <ShieldCheck className="h-4 w-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1">
            <Lock className="h-4 w-4" />
            Gerenciar Acessos
          </TabsTrigger>
        </TabsList>

        {/* === USERS TAB === */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários Cadastrados
              </CardTitle>
              <CardDescription>Lista completa de usuários do sistema</CardDescription>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Completo</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                          <TableCell>{user.username || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {user.sector || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "outline"} className="text-xs">
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.agent && user.agent.is_active ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: user.agent.color || "#3b82f6" }}
                                />
                                <span className="text-xs text-primary font-medium">Agente</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Não Agente</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                                <Pencil className="h-4 w-4" />
                              </Button>

                              {!isDevUser(user) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir <strong>{user.full_name || user.username}</strong>? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CREATE USER TAB === */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Criar Novo Usuário
              </CardTitle>
              <CardDescription>Cadastre novos usuários no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Usuário *</Label>
                    <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Ex: joao.silva" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ex: João Silva" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: joao@email.com" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Usuário *</Label>
                    <Select value={formData.role} onValueChange={(value: "admin" | "user" | "financeiro") => setFormData({ ...formData, role: value })} disabled={loading}>
                      <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{getRoleLabel("admin")}</span>
                            <span className="text-xs text-muted-foreground">{getRoleDescription("admin")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{getRoleLabel("user")}</span>
                            <span className="text-xs text-muted-foreground">{getRoleDescription("user")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="financeiro">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{getRoleLabel("financeiro")}</span>
                            <span className="text-xs text-muted-foreground">{getRoleDescription("financeiro")}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">Setor *</Label>
                    <Select value={formData.sector} onValueChange={(value: any) => setFormData({ ...formData, sector: value })} disabled={loading}>
                      <SelectTrigger id="sector"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                      <SelectContent>
                        {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agent toggle */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                      <Switch
                        id="isAgent"
                        checked={formData.isAgent}
                        onCheckedChange={(checked) => setFormData({ ...formData, isAgent: checked })}
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <Label htmlFor="isAgent" className="font-medium cursor-pointer flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          É Agente
                        </Label>
                        <p className="text-xs text-muted-foreground">Usuário realizará atendimentos e aparecerá na lista de agentes</p>
                      </div>
                    </div>
                    {formData.isAgent && (
                      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/20 ml-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="agentColor" className="text-sm">Cor do Agente:</Label>
                          <Input id="agentColor" type="color" value={formData.agentColor} onChange={(e) => setFormData({ ...formData, agentColor: e.target.value })} className="w-10 h-8 p-0 border-0" disabled={loading} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="receivesBonus" checked={formData.receivesBonus} onCheckedChange={(checked) => setFormData({ ...formData, receivesBonus: checked === true })} disabled={loading} />
                          <Label htmlFor="receivesBonus" className="text-sm cursor-pointer">Recebe Bonificação</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>) : (<><UserPlus className="mr-2 h-4 w-4" />Criar Usuário</>)}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PERMISSIONS TAB === */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Matriz de Permissões
              </CardTitle>
              <CardDescription>Visualização das permissões por página, setor e cargo</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsMatrix />
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ACCESS MANAGEMENT TAB === */}
        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Gerenciar Acessos Individuais
              </CardTitle>
              <CardDescription>Conceda ou retire permissões granulares por usuário e página (overrides sobre as regras padrão de setor/cargo)</CardDescription>
            </CardHeader>
            <CardContent>
              <UserPermissionsEditor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere as informações do usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={editFormData.fullName} onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={editFormData.sector} onValueChange={(value: any) => setEditFormData({ ...editFormData, sector: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editFormData.role} onValueChange={handleEditRoleChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{getRoleLabel("admin")}</SelectItem>
                    <SelectItem value="user">{getRoleLabel("user")}</SelectItem>
                    <SelectItem value="financeiro">{getRoleLabel("financeiro")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Agent toggle in edit */}
            <div className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30">
              <Switch
                checked={editFormData.isAgent}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isAgent: checked })}
              />
              <Label className="font-medium flex items-center gap-2 cursor-pointer">
                <UserCheck className="h-4 w-4" />
                É Agente
              </Label>
            </div>
            {editFormData.isAgent && (
              <div className="flex flex-wrap gap-4 p-3 border rounded-lg bg-muted/20 ml-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Cor:</Label>
                  <Input type="color" value={editFormData.agentColor} onChange={(e) => setEditFormData({ ...editFormData, agentColor: e.target.value })} className="w-10 h-8 p-0 border-0" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={editFormData.receivesBonus} onCheckedChange={(checked) => setEditFormData({ ...editFormData, receivesBonus: checked === true })} />
                  <Label className="text-sm cursor-pointer">Recebe Bonificação</Label>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingUser(null); }}>Cancelar</Button>
            <Button onClick={handleUpdateUser} disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role change confirmation */}
      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de permissão</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o cargo deste usuário para <strong>Administrador</strong>. Administradores possuem controle total sobre o sistema dentro do seu setor. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRoleChange(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
