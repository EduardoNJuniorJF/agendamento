import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Database } from '@/types/database';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];

const statusLabels = {
  available: 'Disponível',
  in_use: 'Em Uso',
  maintenance: 'Manutenção',
};

const statusVariants = {
  available: 'default',
  in_use: 'secondary',
  maintenance: 'destructive',
} as const;

export default function Fleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleInsert>({
    model: '',
    plate: '',
    status: 'available',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('model', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar veículos', variant: 'destructive' });
      return;
    }

    setVehicles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVehicle) {
      const { error } = await supabase
        .from('vehicles')
        .update({
          model: formData.model,
          plate: formData.plate,
          status: formData.status,
        })
        .eq('id', editingVehicle.id);

      if (error) {
        toast({ title: 'Erro ao atualizar veículo', variant: 'destructive' });
        return;
      }

      toast({ title: 'Veículo atualizado com sucesso!' });
    } else {
      const { error } = await supabase.from('vehicles').insert({
        model: formData.model,
        plate: formData.plate,
        status: formData.status,
      });

      if (error) {
        toast({ title: 'Erro ao adicionar veículo', variant: 'destructive' });
        return;
      }

      toast({ title: 'Veículo adicionado com sucesso!' });
    }

    setOpen(false);
    setEditingVehicle(null);
    setFormData({ model: '', plate: '', status: 'available' });
    loadVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir veículo', variant: 'destructive' });
      return;
    }

    toast({ title: 'Veículo excluído com sucesso!' });
    loadVehicles();
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      model: vehicle.model,
      plate: vehicle.plate,
      status: vehicle.status,
    });
    setOpen(true);
  };

  const openNewDialog = () => {
    setEditingVehicle(null);
    setFormData({ model: '', plate: '', status: 'available' });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Frota</h1>
          <p className="text-muted-foreground">Gerencie os veículos da empresa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Veículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Gol, Saveiro"
                  required
                />
              </div>
              <div>
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="Ex: ABC-1234"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="in_use">Em Uso</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
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
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.model}</TableCell>
                <TableCell>{vehicle.plate}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[vehicle.status]}>
                    {statusLabels[vehicle.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(vehicle)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
