import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2 } from 'lucide-react';

export default function UserManagement() {
  const { role, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'user' | 'financeiro'
  });

  // Only allow admin and dev to access this page
  if (role !== 'admin' && role !== 'dev') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password || !formData.fullName) {
      toast.error('Preencha todos os campos');
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
        role: 'user'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'user': return 'Usuário';
      case 'financeiro': return 'Leitor';
      default: return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Controle total e irrestrito ao sistema';
      case 'user': return 'Pode alterar Calendário e Dashboard';
      case 'financeiro': return 'Apenas visualização e impressão';
      default: return '';
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 max-w-4xl">
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

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full">
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
            </div>
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
    </div>
  );
}
