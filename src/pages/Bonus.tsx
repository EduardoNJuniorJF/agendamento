import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Settings, Printer, Plus, Trash2, Edit2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agent {
  id: string;
  name: string;
  color: string;
}

interface Appointment {
  id: string;
  title: string;
  city: string;
  date: string;
  status: string;
  is_penalized: boolean;
}

interface AgentAppointment {
  agent_id: string;
  appointment: Appointment;
}

interface BonusSettings {
  id: string;
  base_value: number;
  level_1_value: number;
  level_2_value: number;
  level_3_value: number;
}

interface CityLevel {
  id: string;
  city_name: string;
  level: number;
  km: number;
}

interface AgentBonus {
  agent: Agent;
  totalBonus: number;
  completed: number;
  inProgress: number;
  penalties: number;
}

export default function Bonus() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentBonuses, setAgentBonuses] = useState<AgentBonus[]>([]);
  const [bonusSettings, setBonusSettings] = useState<BonusSettings | null>(null);
  const [cityLevels, setCityLevels] = useState<CityLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityLevel | null>(null);
  const [newCity, setNewCity] = useState({ city_name: "", level: 1, km: 0 });
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { role } = useAuth();

  const isAdmin = role === "admin" || role === "dev";

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsRes, settingsRes, citiesRes] = await Promise.all([
        supabase.from("agents").select("id, name, color").eq("is_active", true).order("name"),
        supabase.from("bonus_settings").select("*").limit(1).maybeSingle(),
        supabase.from("city_bonus_levels").select("*").order("city_name"),
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (settingsRes.data) setBonusSettings(settingsRes.data);
      if (citiesRes.data) setCityLevels(citiesRes.data);

      await calculateBonuses(agentsRes.data || [], settingsRes.data, citiesRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBonuses = async (
    agentsList: Agent[],
    settings: BonusSettings | null,
    cities: CityLevel[]
  ) => {
    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

    const bonuses: AgentBonus[] = [];

    for (const agent of agentsList) {
      // Get appointments for this agent in the selected month
      const { data: appointmentAgents } = await supabase
        .from("appointment_agents")
        .select("appointment_id")
        .eq("agent_id", agent.id);

      if (!appointmentAgents || appointmentAgents.length === 0) {
        bonuses.push({
          agent,
          totalBonus: 0,
          completed: 0,
          inProgress: 0,
          penalties: 0,
        });
        continue;
      }

      const appointmentIds = appointmentAgents.map((aa) => aa.appointment_id);

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, title, city, date, status, is_penalized")
        .in("id", appointmentIds)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (!appointments) {
        bonuses.push({
          agent,
          totalBonus: 0,
          completed: 0,
          inProgress: 0,
          penalties: 0,
        });
        continue;
      }

      let totalBonus = 0;
      let completed = 0;
      let inProgress = 0;
      let penalties = 0;

      for (const apt of appointments) {
        if (apt.status === "completed") completed++;
        if (apt.status === "in_progress") inProgress++;
        if (apt.is_penalized) penalties++;

        // Calculate bonus only for completed and not penalized
        if (apt.status === "completed" && !apt.is_penalized) {
          const cityUpper = apt.city?.toUpperCase() || "";
          
          // Online attendance = R$0
          if (cityUpper.includes("ONLINE")) {
            continue;
          }

          // Find city level
          const cityConfig = cities.find(
            (c) => c.city_name.toUpperCase() === cityUpper
          );

          if (settings && cityConfig) {
            const baseValue = Number(settings.base_value) || 0;
            let levelValue = 0;
            
            switch (cityConfig.level) {
              case 1:
                levelValue = Number(settings.level_1_value) || 0;
                break;
              case 2:
                levelValue = Number(settings.level_2_value) || 0;
                break;
              case 3:
                levelValue = Number(settings.level_3_value) || 0;
                break;
            }
            
            totalBonus += baseValue + levelValue;
          } else if (settings) {
            // City not configured, use base value only
            totalBonus += Number(settings.base_value) || 0;
          }
        }
      }

      bonuses.push({
        agent,
        totalBonus,
        completed,
        inProgress,
        penalties,
      });
    }

    setAgentBonuses(bonuses);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleUpdateSettings = async () => {
    if (!bonusSettings) return;

    const { error } = await supabase
      .from("bonus_settings")
      .update({
        base_value: bonusSettings.base_value,
        level_1_value: bonusSettings.level_1_value,
        level_2_value: bonusSettings.level_2_value,
        level_3_value: bonusSettings.level_3_value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bonusSettings.id);

    if (error) {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
      loadData();
    }
  };

  const handleAddCity = async () => {
    if (!newCity.city_name.trim()) {
      toast({ title: "Nome da cidade é obrigatório", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("city_bonus_levels").insert({
      city_name: newCity.city_name.toUpperCase(),
      level: newCity.level,
      km: newCity.km,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Cidade já cadastrada", variant: "destructive" });
      } else {
        toast({ title: "Erro ao adicionar cidade", variant: "destructive" });
      }
    } else {
      toast({ title: "Cidade adicionada com sucesso!" });
      setNewCity({ city_name: "", level: 1, km: 0 });
      loadData();
    }
  };

  const handleUpdateCity = async () => {
    if (!editingCity) return;

    const { error } = await supabase
      .from("city_bonus_levels")
      .update({
        city_name: editingCity.city_name.toUpperCase(),
        level: editingCity.level,
        km: editingCity.km,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCity.id);

    if (error) {
      toast({ title: "Erro ao atualizar cidade", variant: "destructive" });
    } else {
      toast({ title: "Cidade atualizada com sucesso!" });
      setEditingCity(null);
      loadData();
    }
  };

  const handleDeleteCity = async (id: string) => {
    const { error } = await supabase.from("city_bonus_levels").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir cidade", variant: "destructive" });
    } else {
      toast({ title: "Cidade excluída com sucesso!" });
      loadData();
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalGlobal = agentBonuses.reduce((sum, ab) => sum + ab.totalBonus, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Bonificação - ${format(currentDate, "MMMM yyyy", { locale: ptBR })}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 1.2em; text-align: right; margin-top: 20px; }
            .agent-color { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Bonificação</h1>
          <h2 style="text-align: center; color: #666;">${format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
          
          <table>
            <thead>
              <tr>
                <th>Agente</th>
                <th>Atendimentos Concluídos</th>
                <th>Penalidades</th>
                <th>Bonificação Total</th>
              </tr>
            </thead>
            <tbody>
              ${agentBonuses
                .map(
                  (ab) => `
                <tr>
                  <td>
                    <span class="agent-color" style="background-color: ${ab.agent.color}"></span>
                    ${ab.agent.name}
                  </td>
                  <td>${ab.completed}</td>
                  <td>${ab.penalties}</td>
                  <td>R$ ${ab.totalBonus.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="total">
            TOTAL GLOBAL: R$ ${totalGlobal.toFixed(2)}
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalGlobal = agentBonuses.reduce((sum, ab) => sum + ab.totalBonus, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Bonificação</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gestão e cálculo de bonificações mensais
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configurações de Bonificação</DialogTitle>
                  <DialogDescription>
                    Gerencie os valores base e níveis de bonificação
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="values" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="values">Valores</TabsTrigger>
                    <TabsTrigger value="cities">Cidades</TabsTrigger>
                  </TabsList>

                  <TabsContent value="values" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Valores de Bonificação</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>Valor Base de Cálculo (VBC)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bonusSettings?.base_value || 0}
                              onChange={(e) =>
                                setBonusSettings((prev) =>
                                  prev
                                    ? { ...prev, base_value: parseFloat(e.target.value) || 0 }
                                    : prev
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Valor Nível 1</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bonusSettings?.level_1_value || 0}
                              onChange={(e) =>
                                setBonusSettings((prev) =>
                                  prev
                                    ? { ...prev, level_1_value: parseFloat(e.target.value) || 0 }
                                    : prev
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Valor Nível 2</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bonusSettings?.level_2_value || 0}
                              onChange={(e) =>
                                setBonusSettings((prev) =>
                                  prev
                                    ? { ...prev, level_2_value: parseFloat(e.target.value) || 0 }
                                    : prev
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Valor Nível 3</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bonusSettings?.level_3_value || 0}
                              onChange={(e) =>
                                setBonusSettings((prev) =>
                                  prev
                                    ? { ...prev, level_3_value: parseFloat(e.target.value) || 0 }
                                    : prev
                                )
                              }
                            />
                          </div>
                        </div>
                        <Button onClick={handleUpdateSettings}>Salvar Valores</Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="cities" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Adicionar Cidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-4 items-end">
                          <div>
                            <Label>Nome da Cidade</Label>
                            <Input
                              value={newCity.city_name}
                              onChange={(e) =>
                                setNewCity({ ...newCity, city_name: e.target.value })
                              }
                              placeholder="Ex: PETRÓPOLIS"
                            />
                          </div>
                          <div>
                            <Label>Nível</Label>
                            <Select
                              value={String(newCity.level)}
                              onValueChange={(v) =>
                                setNewCity({ ...newCity, level: parseInt(v) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Nível 1</SelectItem>
                                <SelectItem value="2">Nível 2</SelectItem>
                                <SelectItem value="3">Nível 3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Quilometragem</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newCity.km}
                              onChange={(e) =>
                                setNewCity({ ...newCity, km: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                          <Button onClick={handleAddCity}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cidades Cadastradas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cidade</TableHead>
                              <TableHead>Nível</TableHead>
                              <TableHead>KM</TableHead>
                              <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cityLevels.map((city) => (
                              <TableRow key={city.id}>
                                <TableCell>{city.city_name}</TableCell>
                                <TableCell>Nível {city.level}</TableCell>
                                <TableCell>{city.km} km</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingCity(city)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteCity(city.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {cityLevels.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Nenhuma cidade cadastrada
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bonificação</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              R$ {totalGlobal.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Concluídos</CardDescription>
            <CardTitle className="text-2xl">
              {agentBonuses.reduce((sum, ab) => sum + ab.completed, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em Andamento</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {agentBonuses.reduce((sum, ab) => sum + ab.inProgress, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Penalidades</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {agentBonuses.reduce((sum, ab) => sum + ab.penalties, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Agent Bonuses Table */}
      <Card ref={printRef}>
        <CardHeader>
          <CardTitle>Bonificação por Agente</CardTitle>
          <CardDescription>Resumo de produtividade e bonificação do mês</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-center">Concluídos</TableHead>
                  <TableHead className="text-center">Em Andamento</TableHead>
                  <TableHead className="text-center">Penalidades</TableHead>
                  <TableHead className="text-right">Bonificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentBonuses.map((ab) => (
                  <TableRow key={ab.agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ab.agent.color }}
                        />
                        {ab.agent.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{ab.completed}</TableCell>
                    <TableCell className="text-center">{ab.inProgress}</TableCell>
                    <TableCell className="text-center text-red-600">{ab.penalties}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      R$ {ab.totalBonus.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {agentBonuses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum agente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit City Dialog */}
      <Dialog open={!!editingCity} onOpenChange={() => setEditingCity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cidade</DialogTitle>
          </DialogHeader>
          {editingCity && (
            <div className="space-y-4">
              <div>
                <Label>Nome da Cidade</Label>
                <Input
                  value={editingCity.city_name}
                  onChange={(e) =>
                    setEditingCity({ ...editingCity, city_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Nível</Label>
                <Select
                  value={String(editingCity.level)}
                  onValueChange={(v) =>
                    setEditingCity({ ...editingCity, level: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nível 1</SelectItem>
                    <SelectItem value="2">Nível 2</SelectItem>
                    <SelectItem value="3">Nível 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quilometragem</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingCity.km}
                  onChange={(e) =>
                    setEditingCity({ ...editingCity, km: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCity(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCity}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
