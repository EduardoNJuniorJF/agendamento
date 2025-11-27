import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];
type Vacation = Database['public']['Tables']['vacations']['Row'];
type VacationInsert = Database['public']['Tables']['vacations']['Insert'];

export default function Team() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [vacationOpen, setVacationOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentInsert>({
    name: '',
    sector: '',
    is_active: true,
    color: '#3b82f6',
  });
  const [vacationData, setVacationData] = useState<VacationInsert>({
    agent_id: '',
    start_date: '',
    end_date: '',
  });
  const { toast } = useToast();
  const { canEdit } = useAuth();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar agentes', variant: 'destructive' });
      return;
    }

    setAgents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAgent) {
      const { error } = await supabase
        .from('agents')
        .update({
          name: formData.name,
          sector: formData.sector,
          is_active: formData.is_active,
          color: formData.color,
        })
        .eq('id', editingAgent.id);

      if (error) {
        toast({ title: 'Erro ao atualizar agente', variant: 'destructive' });
        return;
      }

      toast({ title: 'Agente atualizado com sucesso!' });
    } else {
      const { error } = await supabase.from('agents').insert({
        name: formData.name,
        sector: formData.sector,
        is_active: formData.is_active,
        color: formData.color,
      });

      if (error) {
        toast({ title: 'Erro ao adicionar agente', variant: 'destructive' });
        return;
      }

      toast({ title: 'Agente adicionado com sucesso!' });
    }

    setOpen(false);
    setEditingAgent(null);
    setFormData({ name: '', sector: '', is_active: true, color: '#3b82f6' });
    loadAgents();
  };

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('vacations').insert({
      agent_id: vacationData.agent_id,
      start_date: vacationData.start_date,
      end_date: vacationData.end_date,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar férias', variant: 'destructive' });
      return;
    }

    toast({ title: 'Férias adicionadas com sucesso!' });
    setVacationOpen(false);
    setVacationData({ agent_id: '', start_date: '', end_date: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return;

    const { error } = await supabase.from('agents').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir agente', variant: 'destructive' });
      return;
    }

    toast({ title: 'Agente excluído com sucesso!' });
    loadAgents();
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      sector: agent.sector || '',
      is_active: agent.is_active,
      color: agent.color || '#3b82f6',
    });
    setOpen(true);
  };

  const openNewDialog = () => {
    setEditingAgent(null);
    setFormData({ name: '', sector: '', is_active: true, color: '#3b82f6' });
    setOpen(true);
  };

  const openVacationDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setVacationData({ agent_id: agent.id, start_date: '', end_date: '' });
    setVacationOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-muted-foreground">Gerencie os agentes e suas férias</p>
        </div>
        {canEdit('team') && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Agente
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? 'Editar Agente' : 'Novo Agente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sector">Setor</Label>
                <Input
                  id="sector"
                  value={formData.sector || ''}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="color">Cor de Identificação</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color || '#3b82f6'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    Esta cor será usada nos agendamentos
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Dialog open={vacationOpen} onOpenChange={setVacationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Férias - {selectedAgent?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVacationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="start_date">Data Início</Label>
              <Input
                id="start_date"
                type="date"
                value={vacationData.start_date}
                onChange={(e) => setVacationData({ ...vacationData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={vacationData.end_date}
                onChange={(e) => setVacationData({ ...vacationData, end_date: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setVacationOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div
                    className="w-8 h-8 rounded-full border-2 border-border"
                    style={{ backgroundColor: agent.color || '#3b82f6' }}
                    title={agent.color || '#3b82f6'}
                  />
                </TableCell>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell>{agent.sector || '-'}</TableCell>
                <TableCell>
                  <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                    {agent.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit('team') && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openVacationDialog(agent)}
                        title="Adicionar Férias"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(agent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
