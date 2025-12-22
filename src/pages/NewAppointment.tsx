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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, Check, ChevronsUpDown, Umbrella, Calendar } from "lucide-react";
import type { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
  is_penalized: boolean;
}

export default function NewAppointment() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentsOnVacation, setAgentsOnVacation] = useState<Set<string>>(new Set());
  const [agentsOnTimeOff, setAgentsOnTimeOff] = useState<Set<string>>(new Set());
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [cityOpen, setCityOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    date: "",
    time: "",
    city: "",
    vehicle_id: null,
    description: "",
    status: "scheduled",
    expense_status: "não_separar",
    is_penalized: false,
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canEdit, role, user } = useAuth();
  const isAdmin = role === "admin" || role === "dev";

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
    loadCurrentUserName();
    // Suporta tanto "id" quanto "edit" como parâmetros para edição
    const editId = searchParams.get("id") || searchParams.get("edit");
    if (editId) {
      setEditingId(editId);
      loadAppointment(editId);
    }
  }, [searchParams, canEdit, navigate]);

  const loadCurrentUserName = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).single();
    if (data) {
      setCurrentUserName(data.full_name || data.username || "Usuário");
    }
  };

  const loadData = async () => {
    const [agentsRes, vehiclesRes, citiesRes] = await Promise.all([
      supabase.from("agents").select("*").eq("is_active", true).order("name"),
      supabase.from("vehicles").select("*").eq("status", "available").order("model"),
      supabase.from("city_bonus_levels").select("city_name").order("city_name"),
    ]);

    if (agentsRes.data) setAgents(agentsRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (citiesRes.data) setCities(citiesRes.data.map((c) => c.city_name));
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
      is_penalized: data.is_penalized || false,
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
      setAgentsOnTimeOff(new Set());
      return;
    }

    // Check vacations
    const vacationChecks = await Promise.all(
      agents.map(async (agent) => {
        const onVacation = await checkVacation(agent.id, date);
        return { agentId: agent.id, onVacation };
      }),
    );

    const vacationSet = new Set(vacationChecks.filter((check) => check.onVacation).map((check) => check.agentId));
    setAgentsOnVacation(vacationSet);

    // Check time_off (folgas)
    const { data: timeOffData } = await supabase
      .from("time_off")
      .select("agent_id")
      .eq("date", date)
      .eq("approved", true);

    const timeOffSet = new Set(timeOffData?.map((t) => t.agent_id).filter((id): id is string => id !== null) || []);
    setAgentsOnTimeOff(timeOffSet);

    // Remove unavailable agents from selection
    const allUnavailable = new Set([...vacationSet, ...timeOffSet]);
    setSelectedAgentIds((prev) => prev.filter((id) => !allUnavailable.has(id)));
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
            is_penalized: formData.is_penalized,
            updated_by_name: currentUserName,
            last_action: "updated",
            last_action_at: new Date().toISOString(),
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
            is_penalized: formData.is_penalized,
            created_by_name: currentUserName,
            last_action: "created",
            last_action_at: new Date().toISOString(),
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
            {editingId ? "Editar Agendamento" : "Novo Agendamento"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {editingId ? "Atualize os dados do atendimento" : "Crie um novo atendimento"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Informações do Agendamento</CardTitle>
          <CardDescription className="text-xs md:text-sm">Preencha os dados do atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
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
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.city || "Selecione uma cidade..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cidade..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                        <CommandGroup>
                          {cities.map((city) => (
                            <CommandItem
                              key={city}
                              value={city}
                              onSelect={(currentValue) => {
                                setFormData({ ...formData, city: currentValue.toUpperCase() });
                                setCityOpen(false);
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", formData.city === city ? "opacity-100" : "opacity-0")}
                              />
                              {city}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" name="city" value={formData.city} required />
              </div>
            </div>

            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
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

            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
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
                        const isOnTimeOff = agentsOnTimeOff.has(agent.id);
                        const isUnavailable = isOnVacation || isOnTimeOff;
                        return (
                          <div key={agent.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={agent.id}
                              checked={selectedAgentIds.includes(agent.id)}
                              onCheckedChange={() => toggleAgentSelection(agent.id)}
                              disabled={isUnavailable}
                            />
                            <label
                              htmlFor={agent.id}
                              className={`text-sm font-medium leading-none cursor-pointer flex-1 flex items-center gap-2 ${
                                isUnavailable ? "opacity-50 cursor-not-allowed line-through" : ""
                              }`}
                            >
                              {agent.name}
                              {isOnVacation && (
                                <span className="flex items-center gap-1 text-xs text-orange-500">
                                  <Umbrella className="h-3 w-3" /> Férias
                                </span>
                              )}
                              {isOnTimeOff && !isOnVacation && (
                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                  <Calendar className="h-3 w-3" /> Folga
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedAgentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                    {selectedAgentIds.map((agentId) => {
                      const agent = agents.find((a) => a.id === agentId);
                      return agent ? (
                        <Badge key={agentId} variant="secondary" className="gap-1 text-xs">
                          {agent.name}
                          <X
                            className="h-2.5 w-2.5 md:h-3 md:w-3 cursor-pointer"
                            onClick={() => removeAgent(agentId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="vehicle">Veículo</Label>
                <Select
                  value={formData.vehicle_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">N/A</SelectItem>
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

            {editingId && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
                <Checkbox
                  id="completed"
                  checked={formData.status === "completed"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? "completed" : "scheduled" })
                  }
                />
                <Label htmlFor="completed" className="cursor-pointer font-medium">
                  Concluído
                </Label>
              </div>
            )}

            <div>
              <Label htmlFor="description">Observações</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Penalty Checkbox - visible to all, editable only by admins */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox
                id="is_penalized"
                checked={formData.is_penalized}
                onCheckedChange={(checked) => {
                  if (isAdmin) {
                    setFormData({ ...formData, is_penalized: checked === true });
                  }
                }}
                disabled={!isAdmin}
              />
              <div className="flex-1">
                <Label
                  htmlFor="is_penalized"
                  className={`font-medium ${!isAdmin ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  Penalidade
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isAdmin
                    ? "Marcar este agendamento como penalizado (não gerará bonificação)"
                    : "Somente administradores podem alterar este campo"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
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
