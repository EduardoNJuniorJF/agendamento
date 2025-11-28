import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X } from "lucide-react";
import type { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

type Agent = Database["public"]["Tables"]["agents"]["Row"];
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

interface FormData {
  title: string;
  date: string;
  time: string;
  city: string;
  vehicle_id: string | null;
  description: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  expense_status: "não_separar" | "separar_dinheiro" | "separar_dia_anterior";
}

export default function NewAppointment() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentsOnVacation, setAgentsOnVacation] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    title: "",
    date: "",
    time: "",
    city: "",
    vehicle_id: null,
    description: "",
    status: "scheduled",
    expense_status: "não_separar",
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canEdit } = useAuth();

  useEffect(() => {
    // Check permissions
    if (!canEdit("calendar")) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/calendar");
      return;
    }

    loadData();
    const editId = searchParams.get("edit");
    if (editId) {
      setEditingId(editId);
      loadAppointment(editId);
    }
  }, [searchParams, canEdit, navigate]);

  const loadData = async () => {
    const [agentsRes, vehiclesRes] = await Promise.all([
      supabase.from("agents").select("*").eq("is_active", true).order("name"),
      supabase.from("vehicles").select("*").eq("status", "available").order("model"),
    ]);

    if (agentsRes.data) setAgents(agentsRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
  };

  const loadAppointment = async (id: string) => {
    const { data, error } = await supabase.from("appointments").select("*").eq("id", id).single();

    if (error || !data) {
      toast({ title: "Erro ao carregar agendamento", variant: "destructive" });
      navigate("/calendar");
      return;
    }

    // Load agents for this appointment
    const { data: appointmentAgents } = await supabase
      .from("appointment_agents")
      .select("agent_id")
      .eq("appointment_id", id);

    if (appointmentAgents && appointmentAgents.length > 0) {
      setSelectedAgentIds(appointmentAgents.map((aa) => aa.agent_id));
    } else if (data.agent_id) {
      // Fallback for legacy appointments
      setSelectedAgentIds([data.agent_id]);
    }

    setFormData({
      title: data.title,
      date: data.date,
      time: data.time,
      city: data.city,
      vehicle_id: data.vehicle_id,
      description: data.description,
      status: data.status,
      expense_status: data.expense_status,
    });
  };

  const checkVacation = async (agentId: string, date: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_agent_on_vacation", {
      p_agent_id: agentId,
      p_date: date,
    });

    if (error) {
      console.error("Error checking vacation:", error);
      return false;
    }

    return data === true;
  };

  const checkAllAgentsVacations = async (date: string) => {
    if (!date || agents.length === 0) {
      setAgentsOnVacation(new Set());
      return;
    }

    const vacationChecks = await Promise.all(
      agents.map(async (agent) => {
        const onVacation = await checkVacation(agent.id, date);
        return { agentId: agent.id, onVacation };
      }),
    );

    const vacationSet = new Set(vacationChecks.filter((check) => check.onVacation).map((check) => check.agentId));

    setAgentsOnVacation(vacationSet);

    // Remove agents on vacation from selection
    setSelectedAgentIds((prev) => prev.filter((id) => !vacationSet.has(id)));
  };

  useEffect(() => {
    if (formData.date && agents.length > 0) {
      checkAllAgentsVacations(formData.date);
    }
  }, [formData.date, agents]);

  const checkVehicleAvailability = async (vehicleId: string, date: string, time: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("check_vehicle_availability", {
      p_vehicle_id: vehicleId,
      p_date: date,
      p_time: time,
    });

    if (error) {
      console.error("Error checking availability:", error);
      return false;
    }

    return data === true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (selectedAgentIds.length > 0 && formData.date) {
        for (const agentId of selectedAgentIds) {
          const onVacation = await checkVacation(agentId, formData.date);
          if (onVacation) {
            const agent = agents.find((a) => a.id === agentId);
            toast({
              title: "Agente em férias",
              description: `${agent?.name || "Um agente selecionado"} está de férias nesta data`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      // --- Validação de Veículo ---
      // Regra de disponibilidade de veículo removida a pedido do usuário.

      if (editingId) {
        // Atualizar agendamento existente
        const { error } = await supabase
          .from("appointments")
          .update({
            title: formData.title,
            date: formData.date,
            time: formData.time,
            city: formData.city,
            vehicle_id: formData.vehicle_id,
            description: formData.description,
            status: formData.status,
            expense_status: formData.expense_status,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Delete old agent assignments
        await supabase.from("appointment_agents").delete().eq("appointment_id", editingId);

        // Insert new agent assignments
        if (selectedAgentIds.length > 0) {
          const { error: agentError } = await supabase.from("appointment_agents").insert(
            selectedAgentIds.map((agentId) => ({
              appointment_id: editingId,
              agent_id: agentId,
            })),
          );

          if (agentError) throw agentError;
        }

        toast({ title: "Agendamento atualizado com sucesso!" });
      } else {
        // Criar novo agendamento
        const { data: newAppointment, error } = await supabase
          .from("appointments")
          .insert({
            title: formData.title,
            date: formData.date,
            time: formData.time,
            city: formData.city,
            vehicle_id: formData.vehicle_id,
            description: formData.description,
            status: formData.status,
            expense_status: formData.expense_status,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert agent assignments
        if (selectedAgentIds.length > 0 && newAppointment) {
          const { error: agentError } = await supabase.from("appointment_agents").insert(
            selectedAgentIds.map((agentId) => ({
              appointment_id: newAppointment.id,
              agent_id: agentId,
            })),
          );

          if (agentError) throw agentError;
        }

        toast({ title: "Agendamento criado com sucesso!" });
      }
      navigate("/calendar");
    } catch (error: any) {
      toast({
        title: editingId ? "Erro ao atualizar agendamento" : "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    // Prevent selection if agent is on vacation
    if (agentsOnVacation.has(agentId)) {
      return;
    }

    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  const removeAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => prev.filter((id) => id !== agentId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{editingId ? "Editar Agendamento" : "Novo Agendamento"}</h1>
          <p className="text-muted-foreground">
            {editingId ? "Atualize os dados do atendimento" : "Crie um novo atendimento"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Agendamento</CardTitle>
          <CardDescription>Preencha os dados do atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Cliente / Ticket *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="agents">Agentes</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                      {selectedAgentIds.length === 0
                        ? "Selecione agentes"
                        : `${selectedAgentIds.length} agente(s) selecionado(s)`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                      {agents.map((agent) => {
                        const isOnVacation = agentsOnVacation.has(agent.id);
                        return (
                          <div key={agent.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={agent.id}
                              checked={selectedAgentIds.includes(agent.id)}
                              onCheckedChange={() => toggleAgentSelection(agent.id)}
                              disabled={isOnVacation}
                            />
                            <label
                              htmlFor={agent.id}
                              className={`text-sm font-medium leading-none cursor-pointer flex-1 ${
                                isOnVacation ? "opacity-50 cursor-not-allowed line-through" : ""
                              }`}
                            >
                              {agent.name}
                              {isOnVacation && <span className="ml-2 text-xs text-muted-foreground">(de férias)</span>}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedAgentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAgentIds.map((agentId) => {
                      const agent = agents.find((a) => a.id === agentId);
                      return agent ? (
                        <Badge key={agentId} variant="secondary" className="gap-1">
                          {agent.name}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeAgent(agentId)} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="vehicle">Veículo</Label>
                <Select
                  value={formData.vehicle_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="expenses">Despesas</Label>
              <Select
                value={formData.expense_status || "não_separar"}
                onValueChange={(value: any) => setFormData({ ...formData, expense_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de despesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="não_separar">Não Separar</SelectItem>
                  <SelectItem value="separar_dinheiro">Separar dinheiro</SelectItem>
                  <SelectItem value="separar_dia_anterior">Separar no dia anterior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Observações</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? editingId
                    ? "Salvando..."
                    : "Criando..."
                  : editingId
                    ? "Salvar Alterações"
                    : "Criar Agendamento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
