import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Edit, Plus, Trash2, Umbrella } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isBeforeWeekendOrHoliday, calculateReturnDate, getHolidayName } from '@/lib/holidays';
import { useAuth } from '@/contexts/AuthContext';

interface Agent {
  id: string;
  name: string;
  color: string | null;
}

interface Vacation {
  id: string;
  agent_id: string;
  start_date: string;
  end_date: string;
  expiry_date: string | null;
  deadline: string | null;
  days: number;
  period_number: number;
  notes: string | null;
  agents: { name: string; color: string | null };
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [reminders, setReminders] = useState<VacationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vacations');
  const { toast } = useToast();
  const { canEdit } = useAuth();

  // Vacation form
  const [vacationForm, setVacationForm] = useState({
    agent_id: '',
    start_date: '',
    end_date: '',
    expiry_date: '',
    deadline: '',
    days: 30,
    period_number: 1,
    notes: '',
  });
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);

  // Time off form
  const [timeOffForm, setTimeOffForm] = useState({
    date: '',
    agent_id: '',
    type: 'completa',
    approved: false,
  });
  const [editingTimeOffId, setEditingTimeOffId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadReminders();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, vacationsRes, timeOffsRes] = await Promise.all([
        supabase.from('agents').select('id, name, color').eq('is_active', true).order('name'),
        supabase.from('vacations').select('*, agents(name, color)').order('start_date', { ascending: false }),
        supabase.from('time_off').select('*, agents(name, color)').order('date', { ascending: false }),
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (vacationsRes.data) setVacations(vacationsRes.data as Vacation[]);
      if (timeOffsRes.data) setTimeOffs(timeOffsRes.data as TimeOff[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_upcoming_vacation_reminders');
      if (error) throw error;
      if (data) setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vacationForm.agent_id || !vacationForm.start_date) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // Validação: não permitir início em véspera de fim de semana ou feriado
    const startDate = parseISO(vacationForm.start_date);
    if (isBeforeWeekendOrHoliday(startDate)) {
      const holidayName = getHolidayName(startDate);
      toast({
        title: 'Data inválida',
        description: holidayName 
          ? `Não é possível iniciar férias em véspera de feriado (${holidayName} no dia seguinte).`
          : 'Não é possível iniciar férias em véspera de fim de semana ou feriado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingVacationId) {
        const { error } = await supabase
          .from('vacations')
          .update(vacationForm)
          .eq('id', editingVacationId);
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Férias atualizadas!' });
      } else {
        const { error } = await supabase.from('vacations').insert(vacationForm);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Férias cadastradas!' });
      }

      setVacationForm({
        agent_id: '',
        start_date: '',
        end_date: '',
        expiry_date: '',
        deadline: '',
        days: 30,
        period_number: 1,
        notes: '',
      });
      setEditingVacationId(null);
      loadData();
      loadReminders();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!timeOffForm.date) {
      toast({
        title: 'Erro',
        description: 'Selecione uma data',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTimeOffId) {
        const { error } = await supabase
          .from('time_off')
          .update(timeOffForm)
          .eq('id', editingTimeOffId);
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Folga atualizada!' });
      } else {
        const { error } = await supabase.from('time_off').insert(timeOffForm);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Folga cadastrada!' });
      }

      setTimeOffForm({
        date: '',
        agent_id: '',
        type: 'completa',
        approved: false,
      });
      setEditingTimeOffId(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (!confirm('Deseja excluir estas férias?')) return;

    try {
      const { error } = await supabase.from('vacations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Férias excluídas!' });
      loadData();
      loadReminders();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!confirm('Deseja excluir esta folga?')) return;

    try {
      const { error } = await supabase.from('time_off').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Folga excluída!' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const editVacation = (vacation: Vacation) => {
    setVacationForm({
      agent_id: vacation.agent_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      expiry_date: vacation.expiry_date || '',
      deadline: vacation.deadline || '',
      days: vacation.days,
      period_number: vacation.period_number,
      notes: vacation.notes || '',
    });
    setEditingVacationId(vacation.id);
    setActiveTab('vacations');
  };

  const editTimeOff = (timeOff: TimeOff) => {
    setTimeOffForm({
      date: timeOff.date,
      agent_id: timeOff.agent_id || '',
      type: timeOff.type,
      approved: timeOff.approved,
    });
    setEditingTimeOffId(timeOff.id);
    setActiveTab('time-off');
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Férias e Folgas</h1>
      </div>

      {/* Vacation Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <Alert key={`${reminder.agent_id}-${reminder.start_date}`} variant={reminder.reminder_type === '30_days' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {reminder.reminder_type === '30_days' ? 'Lembrete: 30 dias' : 'Lembrete: 60 dias'}
              </AlertTitle>
              <AlertDescription>
                <strong>{reminder.agent_name}</strong> entrará de férias em{' '}
                {format(parseISO(reminder.start_date), "dd 'de' MMMM", { locale: ptBR })} (faltam {reminder.days_until_start} dias)
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
          {canEdit('vacations') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingVacationId ? 'Editar Férias' : 'Cadastrar Férias'}
                </CardTitle>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleVacationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agent">Funcionário *</Label>
                    <Select
                      value={vacationForm.agent_id}
                      onValueChange={(value) => setVacationForm({ ...vacationForm, agent_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label htmlFor="expiry_date">Vencimento</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={vacationForm.expiry_date}
                      onChange={(e) => setVacationForm({ ...vacationForm, expiry_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadline">Data Limite</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={vacationForm.deadline}
                      onChange={(e) => setVacationForm({ ...vacationForm, deadline: e.target.value })}
                    />
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
                  <Button type="submit">
                    {editingVacationId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  {editingVacationId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingVacationId(null);
                        setVacationForm({
                          agent_id: '',
                          start_date: '',
                          end_date: '',
                          expiry_date: '',
                          deadline: '',
                          days: 30,
                          period_number: 1,
                          notes: '',
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
              <CardTitle>Férias Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Data Saída</TableHead>
                    <TableHead>Data Volta</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((vacation) => (
                    <TableRow key={vacation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: vacation.agents.color || '#3b82f6' }}
                          />
                          {vacation.agents.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{vacation.period_number}º Período</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(vacation.start_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(parseISO(vacation.end_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{vacation.days} dias</TableCell>
                      <TableCell>
                        {vacation.expiry_date ? format(parseISO(vacation.expiry_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {canEdit('vacations') && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => editVacation(vacation)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteVacation(vacation.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="time-off" className="space-y-6">
          {canEdit('vacations') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingTimeOffId ? 'Editar Folga' : 'Cadastrar Folga'}
                </CardTitle>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleTimeOffSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="agent_timeoff">Agente (Opcional)</Label>
                    <Select
                      value={timeOffForm.agent_id || 'no-agent'}
                      onValueChange={(value) => setTimeOffForm({ ...timeOffForm, agent_id: value === 'no-agent' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-agent">Nenhum</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
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

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingTimeOffId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  {editingTimeOffId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingTimeOffId(null);
                        setTimeOffForm({
                          date: '',
                          agent_id: '',
                          type: 'completa',
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
              <CardTitle>Folgas Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeOffs.map((timeOff) => (
                    <TableRow key={timeOff.id}>
                      <TableCell>{format(parseISO(timeOff.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {timeOff.agents ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: timeOff.agents.color || '#3b82f6' }}
                            />
                            {timeOff.agents.name}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={timeOff.type === 'completa' ? 'default' : 'secondary'}>
                          {timeOff.type === 'completa' ? 'Completa' : 'Parcial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={timeOff.approved ? 'default' : 'outline'}>
                          {timeOff.approved ? 'Liberado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canEdit('vacations') && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => editTimeOff(timeOff)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTimeOff(timeOff.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
