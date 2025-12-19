import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2, Pencil, Trash2, Users, UserCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: string;
  username: string | null;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user' | 'financeiro' | 'dev';
  sector: string | null;
}

export default function UserManagement() {
  const { role, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'user' | 'financeiro',
    sector: '' as 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo' | '',
    isAgent: false,
    agentColor: '#3b82f6'
  });

  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'user' as 'admin' | 'user' | 'financeiro' | 'dev',
    sector: '' as 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo' | ''
  });

  if (role !== 'admin' && role !== 'dev') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, full_name, sector');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: User[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'user',
          sector: profile.sector
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password || !formData.fullName || !formData.sector) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Usuário criado com sucesso!');
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'user',
        sector: '',
        isAgent: false,
        agentColor: '#3b82f6'
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email,
      fullName: user.full_name || '',
      role: user.role,
      sector: (user.sector as 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo') || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: editingUser.id,
          username: editFormData.username,
          email: editFormData.email,
          fullName: editFormData.fullName,
          role: editFormData.role,
          sector: editFormData.sector
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Usuário excluído com sucesso!');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'dev': return 'Desenvolvedor';
      case 'user': return 'Usuário';
      case 'financeiro': return 'Leitor';
      default: return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Controle total e irrestrito ao sistema';
      case 'dev': return 'Controle total e irrestrito ao sistema';
      case 'user': return 'Pode alterar Calendário e Dashboard';
      case 'financeiro': return 'Apenas visualização e impressão';
      default: return '';
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 max-w-7xl">
      <div className="grid gap-6">
        {/* Create User Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Novo Usuário
            </CardTitle>
            <CardDescription>
              Apenas administradores podem criar novos usuários no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: joao.silva"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ex: João Silva"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: joao@email.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuário *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'user' | 'financeiro') => 
                      setFormData({ ...formData, role: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{getRoleLabel('admin')}</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('admin')}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{getRoleLabel('user')}</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('user')}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="financeiro">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{getRoleLabel('financeiro')}</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleDescription('financeiro')}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sector">Setor *</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value: 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo') => 
                      setFormData({ ...formData, sector: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="sector">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Suporte">Suporte</SelectItem>
                      <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30">
                    <Checkbox
                      id="isAgent"
                      checked={formData.isAgent}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAgent: checked === true })}
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <Label htmlFor="isAgent" className="font-medium cursor-pointer flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Este usuário também é um Agente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marque se o usuário realizará atendimentos e aparecerá na lista de agentes
                      </p>
                    </div>
                    {formData.isAgent && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="agentColor" className="text-xs">Cor:</Label>
                        <Input
                          id="agentColor"
                          type="color"
                          value={formData.agentColor}
                          onChange={(e) => setFormData({ ...formData, agentColor: e.target.value })}
                          className="w-10 h-8 p-0 border-0"
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Tipos de Usuário:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><strong>Administrador:</strong> Controle total e irrestrito ao sistema</li>
                <li><strong>Usuário:</strong> Pode alterar apenas Calendário e Dashboard</li>
                <li><strong>Leitor:</strong> Apenas visualização e impressão</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Users List Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>
              Lista de todos os usuários do sistema
            </CardDescription>
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(user => role === 'dev' || (user.role !== 'dev' && user.username?.toLowerCase() !== 'dev'))
                      .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username || '-'}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground">
                            {user.sector || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                            {getRoleLabel(user.role)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                              setIsEditDialogOpen(open);
                              if (!open) setEditingUser(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Usuário</DialogTitle>
                                  <DialogDescription>
                                    Altere as informações do usuário
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-username">Nome de Usuário</Label>
                                    <Input
                                      id="edit-username"
                                      value={editFormData.username}
                                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-fullName">Nome Completo</Label>
                                    <Input
                                      id="edit-fullName"
                                      value={editFormData.fullName}
                                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-email">E-mail</Label>
                                    <Input
                                      id="edit-email"
                                      type="email"
                                      value={editFormData.email}
                                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-role">Tipo de Usuário</Label>
                                    <Select
                                      value={editFormData.role}
                                      onValueChange={(value: 'admin' | 'user' | 'financeiro') => 
                                        setEditFormData({ ...editFormData, role: value })
                                      }
                                    >
                                      <SelectTrigger id="edit-role">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">{getRoleLabel('admin')}</SelectItem>
                                        <SelectItem value="user">{getRoleLabel('user')}</SelectItem>
                                        <SelectItem value="financeiro">{getRoleLabel('financeiro')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-sector">Setor</Label>
                                    <Select
                                      value={editFormData.sector}
                                      onValueChange={(value: 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo') => 
                                        setEditFormData({ ...editFormData, sector: value })
                                      }
                                    >
                                      <SelectTrigger id="edit-sector">
                                        <SelectValue placeholder="Selecione o setor" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Comercial">Comercial</SelectItem>
                                        <SelectItem value="Suporte">Suporte</SelectItem>
                                        <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                                        <SelectItem value="Administrativo">Administrativo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setIsEditDialogOpen(false);
                                      setEditingUser(null);
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleUpdateUser} disabled={loading}>
                                    {loading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                      </>
                                    ) : (
                                      'Salvar'
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário <strong>{user.username}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
