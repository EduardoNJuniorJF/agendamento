import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Settings, Printer, Plus, Trash2, Edit2, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoReport from "@/assets/logo-bonus-report.png";

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
  penalties: number;
  completedLevel1: number;
  completedLevel2: number;
  completedLevel3: number;
  penaltiesLevel1: number;
  penaltiesLevel2: number;
  penaltiesLevel3: number;
}

interface DetailedAppointment {
  id: string;
  city: string;
  date: string;
  level: number;
  is_penalized: boolean;
  bonusValue: number;
}

interface AgentDailyReport {
  date: string;
  appointments: DetailedAppointment[];
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
  const [detailedReportAgent, setDetailedReportAgent] = useState<Agent | null>(null);
  const [detailedReport, setDetailedReport] = useState<AgentDailyReport[]>([]);
  const [detailedReportTotal, setDetailedReportTotal] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
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
        supabase
          .from("agents")
          .select("id, name, color, receives_bonus")
          .eq("is_active", true)
          .eq("receives_bonus", true)
          .order("name"),
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

  const calculateBonuses = async (agentsList: Agent[], settings: BonusSettings | null, cities: CityLevel[]) => {
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
          penalties: 0,
          completedLevel1: 0,
          completedLevel2: 0,
          completedLevel3: 0,
          penaltiesLevel1: 0,
          penaltiesLevel2: 0,
          penaltiesLevel3: 0,
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
          penalties: 0,
          completedLevel1: 0,
          completedLevel2: 0,
          completedLevel3: 0,
          penaltiesLevel1: 0,
          penaltiesLevel2: 0,
          penaltiesLevel3: 0,
        });
        continue;
      }

      let totalBonus = 0;
      let completed = 0;
      let penalties = 0;
      let completedLevel1 = 0;
      let completedLevel2 = 0;
      let completedLevel3 = 0;
      let penaltiesLevel1 = 0;
      let penaltiesLevel2 = 0;
      let penaltiesLevel3 = 0;

      for (const apt of appointments) {
        if (apt.status === "completed" || apt.status === "scheduled") {
          completed++;

          const cityUpper = apt.city?.toUpperCase() || "";
          const cityConfig = cities.find((c) => c.city_name.toUpperCase() === cityUpper);

          const level = cityConfig?.level || 0;

          if (level === 1) completedLevel1++;
          if (level === 2) completedLevel2++;
          if (level === 3) completedLevel3++;

          if (apt.is_penalized) {
            penalties++;
            if (level === 1) penaltiesLevel1++;
            if (level === 2) penaltiesLevel2++;
            if (level === 3) penaltiesLevel3++;
          }
        }

        // Lógica de Cálculo de Bônus Monetário (Apenas para agendamentos CONCLUÍDOS OU AGENDADOS, E NÃO PENALIZADOS)
        // Isso garante que agendamentos penalizados (is_penalized: true) não recebam bônus,
        // e que agendamentos agendados (scheduled) também sejam elegíveis se não penalizados.
        if ((apt.status === "completed" || apt.status === "scheduled") && !apt.is_penalized) {
          const cityUpper = apt.city?.toUpperCase() || "";

          // Agendamentos Online não geram bônus (R$0)
          if (cityUpper.includes("ONLINE")) {
            continue;
          }

          // Encontra a configuração de nível da cidade
          const cityConfig = cities.find((c) => c.city_name.toUpperCase() === cityUpper);

          if (settings && cityConfig) {
            let levelValue = 0;

            // Determina o valor do bônus com base no nível da cidade
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

            // Adiciona o valor do bônus ao total
            totalBonus += levelValue;
          }
          // Cidade não configurada = R$0 bônus
        }
      }

      bonuses.push({
        agent,
        totalBonus,
        completed,
        penalties,
        completedLevel1,
        completedLevel2,
        completedLevel3,
        penaltiesLevel1,
        penaltiesLevel2,
        penaltiesLevel3,
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

  const loadDetailedReport = async (agent: Agent) => {
    setDetailedReportAgent(agent);
    setLoadingReport(true);

    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Get appointments for this agent in the selected month
      const { data: appointmentAgents } = await supabase
        .from("appointment_agents")
        .select("appointment_id")
        .eq("agent_id", agent.id);

      const appointmentIds = appointmentAgents?.map((aa) => aa.appointment_id) || [];

      let appointments: any[] = [];
      if (appointmentIds.length > 0) {
        const { data } = await supabase
          .from("appointments")
          .select("id, city, date, status, is_penalized")
          .in("id", appointmentIds)
          .gte("date", format(monthStart, "yyyy-MM-dd"))
          .lte("date", format(monthEnd, "yyyy-MM-dd"))
          .order("date");

        appointments = data || [];
      }

      // Group by day
      const report: AgentDailyReport[] = allDays
        .map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAppointments = appointments
            .filter(
              (apt) =>
                apt.date === dateStr &&
                (apt.status === "completed" || apt.status === "scheduled") &&
                !apt.city?.toUpperCase().includes("ONLINE"), // <<<< ALTERAÇÃO 1: EXCLUINDO ATENDIMENTO ONLINE
            )
            .map((apt) => {
              const cityUpper = apt.city?.toUpperCase() || "";
              const cityConfig = cityLevels.find((c) => c.city_name.toUpperCase() === cityUpper);
              const level = cityConfig?.level || 0;

              let bonusValue = 0;
              // O cálculo de bônus já exclui online e penalizados
              if (!apt.is_penalized && !cityUpper.includes("ONLINE") && bonusSettings && cityConfig) {
                switch (cityConfig.level) {
                  case 1:
                    bonusValue = Number(bonusSettings.level_1_value) || 0;
                    break;
                  case 2:
                    bonusValue = Number(bonusSettings.level_2_value) || 0;
                    break;
                  case 3:
                    bonusValue = Number(bonusSettings.level_3_value) || 0;
                    break;
                }
              }

              return {
                id: apt.id,
                city: apt.city,
                date: apt.date,
                level,
                is_penalized: apt.is_penalized || false,
                bonusValue,
              };
            });

          return {
            date: dateStr,
            appointments: dayAppointments,
          };
        })
        .filter((day) => day.appointments.length > 0); // <<<< ALTERAÇÃO 2: EXCLUINDO DIAS SEM AGENDAMENTOS (AGORA FILTRADOS)

      const total = report.reduce(
        (sum, day) => sum + day.appointments.reduce((daySum, apt) => daySum + apt.bonusValue, 0),
        0,
      );

      setDetailedReport(report);
      setDetailedReportTotal(total);
    } catch (error) {
      console.error("Error loading detailed report:", error);
      toast({ title: "Erro ao carregar relatório detalhado", variant: "destructive" });
    } finally {
      setLoadingReport(false);
    }
  };

  {
    /*relatório detalhado*/
  }
  const handlePrintDetailedReport = () => {
    if (!detailedReportAgent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date();
    
    // Converter o caminho do logo para URL absoluta
    const logoUrl = new URL(logoReport, window.location.origin).href;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Detalhado - ${detailedReportAgent.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 15px; max-width: 800px; margin: 0 auto; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .header-right { text-align: right; font-size: 10px; }
            .logo { max-height: 40px; }
            .agent-name { font-size: 12px; font-weight: bold; margin-top: 5px; }
            h2 { font-size: 14px; margin: 10px 0; }
            .day-section { margin-bottom: 8px; }
            .day-header { font-weight: bold; background: #eee; padding: 4px 8px; border-left: 3px solid #000; margin-bottom: 2px; font-size: 10px; }
            .no-appointment { font-style: italic; padding: 2px 8px; font-size: 10px; }
            .appointment-row { display: flex; justify-content: space-between; padding: 2px 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
            .appointment-info { display: flex; gap: 15px; }
            .bonus { font-weight: bold; }
            .total-section { margin-top: 15px; padding: 10px; border: 1px solid #000; }
            .total-value { font-size: 14px; font-weight: bold; }
            .signature-section { margin-top: 25px; border-top: 1px solid #000; padding-top: 10px; font-size: 10px; }
            .signature-text { line-height: 1.6; }
            .signature-line { margin-top: 20px; }
            .signature-line p { margin: 5px 0; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="${logoUrl}" class="logo" alt="Logo" />
            </div>
            <div class="header-right">
              <div>Data de impressão: ${format(today, "dd/MM/yyyy")}</div>
              <div>Mês de referência: ${format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</div>
              <div class="agent-name">Agente: ${detailedReportAgent.name}</div>
            </div>
          </div>

          <h2 style="text-align: center;">Relatório Detalhado de Atendimentos (Apenas Presenciais)</h2>

          ${detailedReport
            .map(
              (day) => `
            <div class="day-section">
              <div class="day-header">${format(new Date(day.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</div>
              ${
                day.appointments.length === 0 // Esta linha agora NUNCA será verdadeira devido ao filtro (Alteração 2), mas é mantida por segurança.
                  ? '<div class="no-appointment">Não houve atendimento nesse dia.</div>'
                  : day.appointments
                      .map(
                        (apt) => `
                      <div class="appointment-row">
                        <div class="appointment-info">
                          <span><strong>${apt.city}</strong></span>
                          <span>Nível ${apt.level || "N/A"}</span>
                          <span>Penalidade: ${apt.is_penalized ? "SIM" : "NÃO"}</span>
                        </div>
                        <span class="bonus">R$ ${apt.bonusValue.toFixed(2)}</span>
                      </div>
                    `,
                      )
                      .join("")
              }
            </div>
          `,
            )
            .join("")}

          <div class="total-section">
            <strong>Valor total de bonificação a pagar:</strong>
            <span class="total-value">R$ ${detailedReportTotal.toFixed(2)}</span>
          </div>

          <div class="signature-section">
            <div class="signature-text">
              Confirmo que recebi a bonificação informada neste relatório, conforme critérios estabelecidos pela empresa.
              <br />
              Declaro estar ciente do valor pago e de que eventuais dúvidas foram esclarecidas.
            </div>
            <div class="signature-line">
              <p>Assinatura do colaborador: ____________________________</p>
              <p>Data: ____/____/_______</p>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            .separator-right { border-right: 2px solid #A6A8A6 !important; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Relatório de Bonificação</h1>
          <h2 style="text-align: center; color: #666;">${format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
          <table>
            <thead>
              <tr>
                <th rowspan="2">Agente</th>
                <th colspan="4" class="separator-right">Atendimentos</th>
                <th colspan="4">Penalidades</th>
                <th rowspan="2">Bonificação Total</th>
              </tr>
              <tr>                
                <th>Nível 1</th>
                <th>Nível 2</th>
                <th>Nível 3</th>
                <thclass="separator-right">Total</th>
                <th>Nível 1</th>
                <th>Nível 2</th>
                <th>Nível 3</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${agentBonuses
                .map(
                  (ab) => `
                <tr>
                  <td><span class="agent-color" style="background-color: ${ab.agent.color}"></span>${ab.agent.name}</td>
                  <td>${ab.completed}</td><td>${ab.completedLevel1}</td><td>${ab.completedLevel2}</td>
                  <td class="separator-right">${ab.completedLevel3}</td>
                  <td>${ab.penalties}</td><td>${ab.penaltiesLevel1}</td><td>${ab.penaltiesLevel2}</td><td>${ab.penaltiesLevel3}</td>
                  <td>R$ ${ab.totalBonus.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="total">TOTAL GLOBAL: R$ ${totalGlobal.toFixed(2)}</div>
          <script>window.onload = function() { window.print(); }</script>
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
          <p className="text-xs md:text-sm text-muted-foreground">Gestão e cálculo de bonificações mensais</p>
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
                  <DialogDescription>Gerencie os valores base e níveis de bonificação</DialogDescription>
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
                                  prev ? { ...prev, base_value: parseFloat(e.target.value) || 0 } : prev,
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
                                  prev ? { ...prev, level_1_value: parseFloat(e.target.value) || 0 } : prev,
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
                                  prev ? { ...prev, level_2_value: parseFloat(e.target.value) || 0 } : prev,
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
                                  prev ? { ...prev, level_3_value: parseFloat(e.target.value) || 0 } : prev,
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
                              onChange={(e) => setNewCity({ ...newCity, city_name: e.target.value })}
                              placeholder="Ex: PETRÓPOLIS"
                            />
                          </div>
                          <div>
                            <Label>Nível</Label>
                            <Select
                              value={String(newCity.level)}
                              onValueChange={(v) => setNewCity({ ...newCity, level: parseInt(v) })}
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
                              onChange={(e) => setNewCity({ ...newCity, km: parseFloat(e.target.value) || 0 })}
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
                              <TableHead className="w-[100px]">Detalhar</TableHead>
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
                                    <Button variant="ghost" size="icon" onClick={() => setEditingCity(city)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCity(city.id)}>
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

      {/* Navegação */}
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

      {/* Contadores */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* ... O RESTO DA INTERFACE PRINCIPAL CONTINUA AQUI ... */}
      </div>

      {/* Tabela de Bônus */}
      <Card>
        <CardHeader>
          <CardTitle>Bonificação por Agente</CardTitle>
          <CardDescription>Resumo de produtividade e bonificação do mês</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">Carregando dados...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2} className="align-bottom">
                        Agente
                      </TableHead>
                      <TableHead colSpan={4} className="text-center border-b">
                        Atendimentos
                      </TableHead>
                      <TableHead colSpan={4} className="text-center border-b">
                        Penalidades
                      </TableHead>
                      <TableHead rowSpan={2} className="text-right align-bottom">
                        Bonificação
                      </TableHead>
                      <TableHead rowSpan={2} className="w-[80px] text-center align-bottom">
                        Detalhar
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-center">Nível 1</TableHead>
                      <TableHead className="text-center">Nível 2</TableHead>
                      <TableHead className="text-center">Nível 3</TableHead>
                      <TableHead className="text-center border-r-2 border-gray-300">Total</TableHead>
                      <TableHead className="text-center">Nível 1</TableHead>
                      <TableHead className="text-center">Nível 2</TableHead>
                      <TableHead className="text-center">Nível 3</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentBonuses.map((ab) => (
                      <TableRow key={ab.agent.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <span
                            className="w-3 h-3 rounded-full inline-block mr-2"
                            style={{ backgroundColor: ab.agent.color }}
                          ></span>
                          {ab.agent.name}
                        </TableCell>
                        <TableCell className="text-center">{ab.completedLevel1}</TableCell>
                        <TableCell className="text-center">{ab.completedLevel2}</TableCell>
                        <TableCell className="text-center">{ab.completedLevel3}</TableCell>
                        <TableCell className="text-center border-r-2 border-gray-300">{ab.completed}</TableCell>
                        <TableCell className="text-center">{ab.penaltiesLevel1}</TableCell>
                        <TableCell className="text-center">{ab.penaltiesLevel2}</TableCell>
                        <TableCell className="text-center">{ab.penaltiesLevel3}</TableCell>
                        <TableCell className="text-center">{ab.penalties}</TableCell>
                        <TableCell className="text-right font-semibold">R$ {ab.totalBonus.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => loadDetailedReport(ab.agent)}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            {/* Conteúdo do Dialog de Relatório Detalhado */}
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Relatório Detalhado: {detailedReportAgent?.name}</DialogTitle>
                                <DialogDescription>
                                  Atendimentos presenciais elegíveis para bônus em{" "}
                                  {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                                </DialogDescription>
                              </DialogHeader>

                              {loadingReport ? (
                                <p className="text-center py-8">Calculando relatório detalhado...</p>
                              ) : (
                                <>
                                  <div className="space-y-4">
                                    {detailedReport.map((day) => (
                                      <Card key={day.date}>
                                        <CardHeader className="p-3 bg-muted/60">
                                          <CardTitle className="text-sm">
                                            {format(new Date(day.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", {
                                              locale: ptBR,
                                            })}
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                          {day.appointments.map((apt, index) => (
                                            <div
                                              key={index}
                                              className="flex justify-between items-center p-3 border-b text-sm"
                                            >
                                              <div className="flex items-center space-x-4">
                                                <span className="font-medium">{apt.city}</span>
                                                <span className="text-xs text-muted-foreground">Nível {apt.level}</span>
                                                {apt.is_penalized && (
                                                  <span className="text-xs text-red-500">(Penalizado)</span>
                                                )}
                                              </div>
                                              <span
                                                className={`font-bold ${apt.bonusValue === 0 ? "text-gray-500" : "text-green-600"}`}
                                              >
                                                R$ {apt.bonusValue.toFixed(2)}
                                              </span>
                                            </div>
                                          ))}
                                        </CardContent>
                                      </Card>
                                    ))}
                                    {detailedReport.length === 0 && (
                                      <p className="text-center text-muted-foreground py-8">
                                        Nenhum agendamento elegível encontrado neste mês.
                                      </p>
                                    )}
                                  </div>
                                  <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
                                    <div className="text-lg font-bold">
                                      Total de Bônus: R$ {detailedReportTotal.toFixed(2)}
                                    </div>
                                    <Button onClick={handlePrintDetailedReport} className="mt-2 sm:mt-0">
                                      <Printer className="h-4 w-4 mr-2" />
                                      Imprimir Relatório
                                    </Button>
                                  </DialogFooter>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-right text-lg font-bold">
                TOTAL GERAL DO MÊS: R$ {agentBonuses.reduce((sum, ab) => sum + ab.totalBonus, 0).toFixed(2)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Edição de Cidade */}
      {editingCity && (
        <Dialog open={!!editingCity} onOpenChange={() => setEditingCity(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cidade: {editingCity.city_name}</DialogTitle>
              <DialogDescription>Atualize o nível e a quilometragem da cidade.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Cidade</Label>
                <Input
                  value={editingCity.city_name}
                  onChange={(e) => setEditingCity({ ...editingCity, city_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Nível</Label>
                <Select
                  value={String(editingCity.level)}
                  onValueChange={(v) => setEditingCity({ ...editingCity, level: parseInt(v) })}
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
                  onChange={(e) => setEditingCity({ ...editingCity, km: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCity(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateCity}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
