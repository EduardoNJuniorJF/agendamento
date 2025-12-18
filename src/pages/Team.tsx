import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

type Agent = Database["public"]["Tables"]["agents"]["Row"] & {
  receives_bonus?: boolean;
};
type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];

export default function Team() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentInsert & { receives_bonus: boolean }>({
    name: "",
    sector: "",
    is_active: true,
    color: "#3b82f6",
    receives_bonus: true,
  });
  const { toast } = useToast();
  const { canEditTeam, sector, role } = useAuth();
  
  // Filtrar agentes por setor (exceto Administrativo que vê todos)
  const shouldFilterBySector = sector !== 'Administrativo' && role !== 'dev';

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    // Buscar agentes
    const { data: agentsData, error } = await supabase.from("agents").select("*").order("name", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar agentes", variant: "destructive" });
      return;
    }

    if (!agentsData) {
      setAgents([]);
      return;
    }

    // Para agentes com user_id, buscar o setor do profile correspondente
    const agentsWithSector = await Promise.all(
      agentsData.map(async (agent) => {
        // Se o agente já tem setor, usar ele
        if (agent.sector) return agent;

        // Se o agente tem user_id, buscar o setor do profile
        if (agent.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("sector")
            .eq("id", agent.user_id)
            .single();

          if (profile?.sector) {
            return { ...agent, sector: profile.sector };
          }
        }

        return agent;
      })
    );

    setAgents(agentsWithSector);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAgent) {
      const { error } = await supabase
        .from("agents")
        .update({
          name: formData.name,
          sector: formData.sector,
          is_active: formData.is_active,
          color: formData.color,
          receives_bonus: formData.receives_bonus,
        })
        .eq("id", editingAgent.id);

      if (error) {
        toast({ title: "Erro ao atualizar agente", variant: "destructive" });
        return;
      }

      toast({ title: "Agente atualizado com sucesso!" });
    } else {
      const { error } = await supabase.from("agents").insert({
        name: formData.name,
        sector: formData.sector,
        is_active: formData.is_active,
        color: formData.color,
        receives_bonus: formData.receives_bonus,
      });

      if (error) {
        toast({ title: "Erro ao adicionar agente", variant: "destructive" });
        return;
      }

      toast({ title: "Agente adicionado com sucesso!" });
    }

    setOpen(false);
    setEditingAgent(null);
    setFormData({ name: "", sector: "", is_active: true, color: "#3b82f6", receives_bonus: true });
    loadAgents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agente?")) return;

    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir agente", variant: "destructive" });
      return;
    }

    toast({ title: "Agente excluído com sucesso!" });
    loadAgents();
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      sector: agent.sector || "",
      is_active: agent.is_active ?? true,
      color: agent.color || "#3b82f6",
      receives_bonus: agent.receives_bonus ?? true,
    });
    setOpen(true);
  };

  const openNewDialog = () => {
    setEditingAgent(null);
    setFormData({ name: "", sector: "", is_active: true, color: "#3b82f6", receives_bonus: true });
    setOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie os agentes</p>
        </div>
        {canEditTeam() && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Agente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Editar Agente" : "Novo Agente"}</DialogTitle>
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
                  <Select
                    value={formData.sector || ""}
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="color">Cor de Identificação</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color || "#3b82f6"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Esta cor será usada nos agendamentos</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="receives_bonus"
                    checked={formData.receives_bonus ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, receives_bonus: checked })}
                  />
                  <Label htmlFor="receives_bonus">Recebe Bonificação</Label>
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

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[60px]">Cor</TableHead>
                <TableHead className="min-w-[120px]">Nome</TableHead>
                <TableHead className="min-w-[100px]">Setor</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="min-w-[80px]">Bonificação</TableHead>
                <TableHead className="text-right min-w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents
                .filter(agent => !shouldFilterBySector || agent.sector === sector)
                .map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div
                      className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-border"
                      style={{ backgroundColor: agent.color || "#3b82f6" }}
                      title={agent.color || "#3b82f6"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>{agent.sector || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? "default" : "secondary"} className="text-xs">
                      {agent.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.receives_bonus !== false ? "default" : "secondary"} className="text-xs">
                      {agent.receives_bonus !== false ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEditTeam() && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(agent)}>
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(agent.id)}>
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
