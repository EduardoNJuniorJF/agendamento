import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Edit, Plus, Trash2, Umbrella, Check, ChevronsUpDown, ArrowUpDown } from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  isBeforeWeekendOrHoliday,
  calculateReturnDate,
  getHolidayName,
  isWeekendOrHoliday,
  isTwoDaysBeforeWeekendOrHoliday,
  LocalHolidayData,
} from "@/lib/holidays";
import { addMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  sector: string | null;
}

interface Vacation {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  expiry_date: string | null;
  deadline: string | null;
  days: number;
  period_number: number;
  notes: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

interface TimeOff {
  id: string;
  date: string;
  agent_id: string | null;
  type: string;
  approved: boolean;
  agents: { name: string; color: string | null } | null;
}

interface VacationReminder {
  agent_id: string;
  agent_name: string;
  start_date: string;
  days_until_start: number;
  reminder_type: string;
}

export default function Vacations() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [reminders, setReminders] = useState<VacationReminder[]>([]);
  const [localHolidays, setLocalHolidays] = useState<LocalHolidayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vacations");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const { toast } = useToast();
  const { canEditVacations, sector, role } = useAuth();
  
  // Administrativo pode editar de todos os setores
  // Outros admins só podem editar do seu setor
  const canEdit = canEditVacations();
  
  // Filtrar dados por setor (Administrativo vê todos)
  const shouldFilterBySector = sector !== 'Administrativo' && role !== 'dev';

  // Vacation form
  const [vacationForm, setVacationForm] = useState({
    user_id: "",
    start_date: "",
    end_date: "",
    expiry_date: "",
    deadline: "",
    days: 30,
    period_number: 1,
    notes: "",
  });
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [vacationSortOrder, setVacationSortOrder] = useState<string>("start_asc");

  // Time off form
  const [timeOffForm, setTimeOffForm] = useState({
    date: "",
    agent_id: "",
    type: "completa",
    approved: false,
  });
  const [editingTimeOffId, setEditingTimeOffId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadReminders();
    loadLocalHolidays();
  }, [sector, role]);

  const loadLocalHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("local_holidays")
        .select("id, name, day, month, year");
      
      if (error) throw error;
      setLocalHolidays(data || []);
    } catch (error) {
      console.error("Error loading local holidays:", error);
    }
  };

  const loadData = async () => {
    try {
      const [profilesRes, agentsRes, vacationsRes, timeOffsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, sector").order("full_name"),
        supabase.from("agents").select("id, name, color, sector").eq("is_active", true).order("name"),
        supabase.from("vacations").select("*, profiles(full_name, email, sector)").order("start_date", { ascending: false }),
        supabase.from("time_off").select("*, agents(name, color, sector)").order("date", { ascending: false }),
      ]);

      // Filtrar profiles por setor (para o formulário)
      let filteredProfiles = profilesRes.data || [];
      if (shouldFilterBySector && sector) {
        filteredProfiles = filteredProfiles.filter((p: any) => p.sector === sector);
      }
      
      // Filtrar agents por setor (para o formulário de folgas)
      let filteredAgents = agentsRes.data || [];
      if (shouldFilterBySector && sector) {
        filteredAgents = filteredAgents.filter((a: any) => a.sector === sector);
      }
      
      // Filtrar férias por setor
      let filteredVacations = vacationsRes.data || [];
      if (shouldFilterBySector && sector) {
        filteredVacations = filteredVacations.filter((v: any) => v.profiles?.sector === sector);
      }
      
      // Filtrar folgas por setor
      let filteredTimeOffs = timeOffsRes.data || [];
      if (shouldFilterBySector && sector) {
        filteredTimeOffs = filteredTimeOffs.filter((t: any) => t.agents?.sector === sector);
      }

      setProfiles(filteredProfiles);
      setAgents(filteredAgents);
      setVacations(filteredVacations as Vacation[]);
      setTimeOffs(filteredTimeOffs as TimeOff[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      const { data, error } = await supabase.rpc("get_upcoming_vacation_reminders");
      if (error) throw error;
      if (data) setReminders(data);
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  };

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vacationForm.user_id || !vacationForm.start_date || !vacationForm.expiry_date) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validação completa do início das férias conforme legislação trabalhista
    const startDate = parseISO(vacationForm.start_date);

    // REGRA 1: Férias não podem iniciar em sábado, domingo ou feriado
    if (isWeekendOrHoliday(startDate, localHolidays)) {
      const holidayName = getHolidayName(startDate, localHolidays);
      toast({
        title: "Data inválida para início de férias",
        description: holidayName
          ? `Não é permitido iniciar férias em feriado (${holidayName}). As férias devem começar em dia útil.`
          : "Não é permitido iniciar férias em dia de Descanso Semanal Remunerado. As férias devem começar em dia útil.",
        variant: "destructive",
      });
      return;
    }

    // REGRA 2: Férias não podem iniciar nos 2 dias que antecedem feriado ou dia de descanso semanal remunerado (DSR)
    // Exemplos: não pode iniciar na quinta-feira (2 dias antes do sábado) ou na quarta-feira (2 dias antes de feriado na sexta)
    if (isTwoDaysBeforeWeekendOrHoliday(startDate, localHolidays)) {
      toast({
        title: "Data inválida para início de férias",
        description:
          "Não é permitido iniciar férias nos dois dias que antecedem um feriado ou domingo (dia de descanso semanal remunerado).",
        variant: "destructive",
      });
      return;
    }

    // REGRA 3: Férias só podem ser marcadas dentro do período concessivo (entre vencimento e data limite)
    if (vacationForm.expiry_date && vacationForm.deadline) {
      const expiryDate = parseISO(vacationForm.expiry_date);
      const deadlineDate = parseISO(vacationForm.deadline);
      
      if (startDate < expiryDate) {
        toast({
          title: "Data fora do período concessivo",
          description: `As férias só podem iniciar a partir do vencimento do período aquisitivo (${format(expiryDate, "dd/MM/yyyy")}). Data selecionada está antes do período permitido.`,
          variant: "destructive",
        });
        return;
      }
      
      if (startDate > deadlineDate) {
        toast({
          title: "Data fora do período concessivo",
          description: `As férias devem iniciar até a data limite (${format(deadlineDate, "dd/MM/yyyy")}). Data selecionada está após o período permitido.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (editingVacationId) {
        const { error } = await supabase.from("vacations").update(vacationForm).eq("id", editingVacationId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Férias atualizadas!" });
      } else {
        const { error } = await supabase.from("vacations").insert(vacationForm);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Férias cadastradas!" });
      }

      setVacationForm({
        user_id: "",
        start_date: "",
        end_date: "",
        expiry_date: "",
        deadline: "",
        days: 30,
        period_number: 1,
        notes: "",
      });
      setEditingVacationId(null);
      loadData();
      loadReminders();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!timeOffForm.date) {
      toast({
        title: "Erro",
        description: "Selecione uma data",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTimeOffId) {
        const { error } = await supabase.from("time_off").update(timeOffForm).eq("id", editingTimeOffId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Folga atualizada!" });
      } else {
        const { error } = await supabase.from("time_off").insert(timeOffForm);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Folga cadastrada!" });
      }

      setTimeOffForm({
        date: "",
        agent_id: "",
        type: "completa",
        approved: false,
      });
      setEditingTimeOffId(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (!confirm("Deseja excluir estas férias?")) return;

    try {
      const { error } = await supabase.from("vacations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Férias excluídas!" });
      loadData();
      loadReminders();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!confirm("Deseja excluir esta folga?")) return;

    try {
      const { error } = await supabase.from("time_off").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Folga excluída!" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editVacation = (vacation: Vacation) => {
    setVacationForm({
      user_id: vacation.user_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      expiry_date: vacation.expiry_date || "",
      deadline: vacation.deadline || "",
      days: vacation.days,
      period_number: vacation.period_number,
      notes: vacation.notes || "",
    });
    setEditingVacationId(vacation.id);
    setActiveTab("vacations");
  };

  const editTimeOff = (timeOff: TimeOff) => {
    setTimeOffForm({
      date: timeOff.date,
      agent_id: timeOff.agent_id || "",
      type: timeOff.type,
      approved: timeOff.approved,
    });
    setEditingTimeOffId(timeOff.id);
    setActiveTab("time-off");
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Férias e Folgas</h1>
      </div>

      {/* Vacation Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <Alert
              key={`${reminder.agent_id}-${reminder.start_date}`}
              variant={reminder.reminder_type === "30_days" ? "destructive" : "default"}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {reminder.reminder_type === "30_days" ? "Lembrete: 30 dias" : "Lembrete: 60 dias"}
              </AlertTitle>
              <AlertDescription>
                <strong>{reminder.agent_name}</strong> entrará de férias em{" "}
                {format(parseISO(reminder.start_date), "dd 'de' MMMM", { locale: ptBR })} (faltam{" "}
                {reminder.days_until_start} dias)
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vacations">
            <Umbrella className="h-4 w-4 mr-2" />
            Férias
          </TabsTrigger>
          <TabsTrigger value="time-off">
            <Calendar className="h-4 w-4 mr-2" />
            Folgas
          </TabsTrigger>
        </TabsList>

        {/* Vacations Tab */}
        <TabsContent value="vacations" className="space-y-6">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>{editingVacationId ? "Editar Férias" : "Cadastrar Férias"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVacationSubmit} className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label htmlFor="user">Funcionário *</Label>
                      <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userSearchOpen}
                            className="w-full justify-between"
                          >
                            {vacationForm.user_id
                              ? profiles.find((p) => p.id === vacationForm.user_id)?.full_name || 
                                profiles.find((p) => p.id === vacationForm.user_id)?.email
                              : "Selecione um funcionário..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar funcionário..." />
                            <CommandList>
                              <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                              <CommandGroup>
                                {profiles.map((profile) => (
                                  <CommandItem
                                    key={profile.id}
                                    value={profile.full_name || profile.email}
                                    onSelect={() => {
                                      setVacationForm({ ...vacationForm, user_id: profile.id });
                                      setUserSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        vacationForm.user_id === profile.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {profile.full_name || profile.email}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="period">Período</Label>
                      <Select
                        value={vacationForm.period_number.toString()}
                        onValueChange={(value) => setVacationForm({ ...vacationForm, period_number: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1º Período</SelectItem>
                          <SelectItem value="2">2º Período</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="days">Dias de Férias *</Label>
                      <Input
                        id="days"
                        type="number"
                        min="1"
                        max="30"
                        value={vacationForm.days}
                        onChange={(e) => {
                          const days = parseInt(e.target.value);
                          const updates: any = { days };

                          // Recalcula a data de volta automaticamente
                          if (vacationForm.start_date && days > 0) {
                            updates.end_date = calculateReturnDate(vacationForm.start_date, days);
                          }

                          setVacationForm({ ...vacationForm, ...updates });
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="start_date">Data Saída *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={vacationForm.start_date}
                        onChange={(e) => {
                          const updates: any = { start_date: e.target.value };

                          // Recalcula a data de volta automaticamente
                          if (e.target.value && vacationForm.days > 0) {
                            updates.end_date = calculateReturnDate(e.target.value, vacationForm.days);
                          }

                          setVacationForm({ ...vacationForm, ...updates });
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Regras: Férias não podem iniciar em feriados, fins de semana, ou nos 2 dias anteriores a eles.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="end_date">Data Volta (calculada automaticamente)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={vacationForm.end_date}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="expiry_date">Vencimento (Período Aquisitivo) *</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={vacationForm.expiry_date}
                        onChange={(e) => {
                          const updates: any = { expiry_date: e.target.value };

                          // Calcula automaticamente a data limite (12 meses após o vencimento)
                          if (e.target.value) {
                            const expiryDate = parseISO(e.target.value);
                            const deadlineDate = addMonths(expiryDate, 12);
                            updates.deadline = format(deadlineDate, "yyyy-MM-dd");
                          } else {
                            updates.deadline = "";
                          }

                          setVacationForm({ ...vacationForm, ...updates });
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Data Limite (Período Concessivo - calculada automaticamente)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={vacationForm.deadline}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Prazo de 12 meses após o vencimento para conceder as férias
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Input
                        id="notes"
                        value={vacationForm.notes}
                        onChange={(e) => setVacationForm({ ...vacationForm, notes: e.target.value })}
                        placeholder="Observações adicionais"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">{editingVacationId ? "Atualizar" : "Cadastrar"}</Button>
                    {editingVacationId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingVacationId(null);
                          setVacationForm({
                            user_id: "",
                            start_date: "",
                            end_date: "",
                            expiry_date: "",
                            deadline: "",
                            days: 30,
                            period_number: 1,
                            notes: "",
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base md:text-lg">Férias Cadastradas</CardTitle>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={vacationSortOrder} onValueChange={setVacationSortOrder}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_asc">Data Saída (mais próxima)</SelectItem>
                    <SelectItem value="start_desc">Data Saída (mais distante)</SelectItem>
                    <SelectItem value="expiry_desc">Vencimento (mais recente)</SelectItem>
                    <SelectItem value="expiry_asc">Vencimento (mais antigo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Funcionário</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Período</TableHead>
                      <TableHead className="min-w-[100px]">Data Saída</TableHead>
                      <TableHead className="min-w-[100px]">Data Volta</TableHead>
                      <TableHead className="min-w-[80px]">Dias</TableHead>
                      <TableHead className="min-w-[100px]">Vencimento</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...vacations].sort((a, b) => {
                      switch (vacationSortOrder) {
                        case "start_asc":
                          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                        case "start_desc":
                          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
                        case "expiry_desc":
                          if (!a.expiry_date && !b.expiry_date) return 0;
                          if (!a.expiry_date) return 1;
                          if (!b.expiry_date) return -1;
                          return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
                        case "expiry_asc":
                          if (!a.expiry_date && !b.expiry_date) return 0;
                          if (!a.expiry_date) return 1;
                          if (!b.expiry_date) return -1;
                          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
                        default:
                          return 0;
                      }
                    }).map((vacation) => {
                      const today = startOfDay(new Date());
                      const startDate = startOfDay(parseISO(vacation.start_date));
                      const endDate = startOfDay(parseISO(vacation.end_date));
                      
                      let status: 'scheduled' | 'in_progress' | 'completed' = 'scheduled';
                      let rowClass = '';
                      
                      if (today > endDate) {
                        status = 'completed';
                        rowClass = 'bg-green-100 dark:bg-green-900/30';
                      } else if (today >= startDate && today <= endDate) {
                        status = 'in_progress';
                        rowClass = 'bg-orange-100 dark:bg-orange-900/30';
                      }
                      
                      const statusConfig = {
                        scheduled: { label: 'Agendado', variant: 'outline' as const },
                        in_progress: { label: 'Em andamento', variant: 'secondary' as const },
                        completed: { label: 'Finalizada', variant: 'default' as const },
                      };
                      
                      return (
                        <TableRow key={vacation.id} className={rowClass}>
                          <TableCell>
                            <span className="text-xs md:text-sm">
                              {vacation.profiles?.full_name || vacation.profiles?.email || "Usuário não definido"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={statusConfig[status].variant}
                              className={cn(
                                "text-xs",
                                status === 'in_progress' && "bg-orange-500 text-white hover:bg-orange-600",
                                status === 'completed' && "bg-green-600 text-white hover:bg-green-700"
                              )}
                            >
                              {statusConfig[status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {vacation.period_number}º Período
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {format(parseISO(vacation.start_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {format(parseISO(vacation.end_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">{vacation.days} dias</TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {vacation.expiry_date ? format(parseISO(vacation.expiry_date), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => editVacation(vacation)}
                                >
                                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleDeleteVacation(vacation.id)}
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="time-off" className="space-y-6">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>{editingTimeOffId ? "Editar Folga" : "Cadastrar Folga"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTimeOffSubmit} className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label htmlFor="date">Data *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={timeOffForm.date}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent_timeoff">Funcionário (Opcional)</Label>
                      <Select
                        value={timeOffForm.agent_id || "no-agent"}
                        onValueChange={(value) =>
                          setTimeOffForm({ ...timeOffForm, agent_id: value === "no-agent" ? "" : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-agent">Nenhum</SelectItem>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={timeOffForm.type}
                        onValueChange={(value) => setTimeOffForm({ ...timeOffForm, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completa">Folga Completa</SelectItem>
                          <SelectItem value="parcial">Folga Parcial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <input
                        id="approved"
                        type="checkbox"
                        checked={timeOffForm.approved}
                        onChange={(e) => setTimeOffForm({ ...timeOffForm, approved: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="approved">Liberado</Label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" className="w-full sm:w-auto">
                      {editingTimeOffId ? "Atualizar" : "Cadastrar"}
                    </Button>
                    {editingTimeOffId && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setEditingTimeOffId(null);
                          setTimeOffForm({
                            date: "",
                            agent_id: "",
                            type: "completa",
                            approved: false,
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Folgas Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Data</TableHead>
                      <TableHead className="min-w-[120px]">Funcionário</TableHead>
                      <TableHead className="min-w-[100px]">Tipo</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeOffs.map((timeOff) => (
                      <TableRow key={timeOff.id}>
                        <TableCell className="text-xs md:text-sm">
                          {format(parseISO(timeOff.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {timeOff.agents ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: timeOff.agents.color || "#3b82f6" }}
                              />
                              <span className="text-xs md:text-sm">{timeOff.agents.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs md:text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={timeOff.type === "completa" ? "default" : "secondary"} className="text-xs">
                            {timeOff.type === "completa" ? "Completa" : "Parcial"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={timeOff.approved ? "default" : "outline"} className="text-xs">
                            {timeOff.approved ? "Liberado" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => editTimeOff(timeOff)}
                              >
                                <Edit className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleDeleteTimeOff(timeOff.id)}
                              >
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
