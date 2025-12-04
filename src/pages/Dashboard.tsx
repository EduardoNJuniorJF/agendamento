import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Car,
  Users,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Umbrella,
  PartyPopper,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { isHoliday, getHolidayName } from "@/lib/holidays";
import { useAuth } from "@/contexts/AuthContext";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DraggableAppointmentCard } from "@/components/DraggableAppointmentCard";
import { DroppableDay } from "@/components/DroppableDay";

interface Appointment {
  id: string;
  title: string;
  city: string;
  date: string;
  time: string;
  description: string | null;
  expense_status: string;
  agents: Array<{ name: string; color: string | null }>;
  vehicles: { model: string; plate: string } | null;
}

interface TimeOff {
  id: string;
  date: string;
  type: string;
  approved: boolean;
  agents: { name: string; color: string | null } | null;
}

interface Vacation {
  id: string;
  agent_id: string;
  start_date: string;
  end_date: string;
  days: number | null;
  agents: { name: string; color: string | null } | null;
}

interface Stats {
  totalAppointments: number;
  totalVehicles: number;
  totalAgents: number;
  weekAppointments: Appointment[];
  weekTimeOffs: TimeOff[];
  vacations: Vacation[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    totalVehicles: 0,
    totalAgents: 0,
    weekAppointments: [],
    weekTimeOffs: [],
    vacations: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Gerar dias da semana (segunda a sexta)
  const getWeekDays = () => {
    const monday = startOfWeek(currentWeek, { weekStartsOn: 1 }); // 1 = segunda-feira
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  };

  const weekDays = getWeekDays();

  useEffect(() => {
    loadStats();
  }, [currentWeek]);

  const loadStats = async () => {
    try {
      const monday = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const friday = addDays(monday, 4);

      const [appointments, vehicles, agents, timeOffs, vacations] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, vehicles(model, plate)")
          .gte("date", format(monday, "yyyy-MM-dd"))
          .lte("date", format(friday, "yyyy-MM-dd"))
          .order("date")
          .order("time"),
        supabase.from("vehicles").select("id"),
        supabase.from("agents").select("id, name").eq("is_active", true),
        supabase
          .from("time_off")
          .select("*, agents(name, color)")
          .gte("date", format(monday, "yyyy-MM-dd"))
          .lte("date", format(friday, "yyyy-MM-dd"))
          .order("date"),
        supabase
          .from("vacations")
          .select("*, agents(name, color)")
          .gte("start_date", format(new Date(), "yyyy-MM-dd"))
          .order("start_date"),
      ]);

      // Load agents for each appointment
      const appointmentsWithAgents = await Promise.all(
        (appointments.data || []).map(async (apt) => {
          const { data: agentData } = await supabase
            .from("appointment_agents")
            .select("agents(name, color)")
            .eq("appointment_id", apt.id);

          return {
            ...apt,
            agents: agentData?.map((aa) => aa.agents).filter(Boolean) || [],
          };
        }),
      );

      if (appointments.data) {
        setStats({
          totalAppointments: appointmentsWithAgents.length,
          totalVehicles: vehicles.data?.length || 0,
          totalAgents: agents.data?.length || 0,
          weekAppointments: appointmentsWithAgents as Appointment[],
          weekTimeOffs: (timeOffs.data as TimeOff[]) || [],
          vacations: (vacations.data as Vacation[]) || [],
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpenseLabel = (status: string) => {
    switch (status) {
      case "não_separar":
        return "Não Separar";
      case "separar_dinheiro":
        return "Separar dinheiro";
      case "separar_dia_anterior":
        return "Separar no dia anterior";
      default:
        return status;
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    return stats.weekAppointments.filter((apt) => isSameDay(parseISO(apt.date), day));
  };

  const getTimeOffsForDay = (day: Date) => {
    return stats.weekTimeOffs.filter((timeOff) => isSameDay(parseISO(timeOff.date), day));
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir agendamento", variant: "destructive" });
      return;
    }

    toast({ title: "Agendamento excluído com sucesso!" });
    loadStats();
  };

  const handleEditAppointment = (id: string) => {
    navigate(`/new-appointment?edit=${id}`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const newDate = over.id as string;

    // Find the appointment
    const appointment = stats.weekAppointments.find((apt) => apt.id === appointmentId);
    if (!appointment || appointment.date === newDate) return;

    try {
      // Update appointment date in database
      const { error } = await supabase.from("appointments").update({ date: newDate }).eq("id", appointmentId);

      if (error) throw error;

      toast({ title: "Agendamento movido com sucesso!" });
      loadStats(); // Reload to reflect changes
    } catch (error) {
      console.error("Error moving appointment:", error);
      toast({
        title: "Erro ao mover agendamento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral do sistema</p>
        </div>

        {/* Cards de estatísticas - Primeira linha */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">Total de atendimentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veículos</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">Frota ativa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agentes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
              <p className="text-xs text-muted-foreground">Equipe ativa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folgas</CardTitle>
              <Umbrella className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekTimeOffs.length}</div>
              <p className="text-xs text-muted-foreground">Esta semana</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendário da Semana - Segunda linha */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg md:text-xl">Calendário da Semana</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-center">
                  <p className="text-xs md:text-sm font-medium">
                    Semana de {format(weekDays[0], "dd/MM/yyyy", { locale: ptBR })} a{" "}
                    {format(weekDays[4], "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentWeek(new Date())} size="sm" className="h-8">
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="overflow-x-auto pb-4 -mx-2 px-2">
              <div className="grid grid-cols-5 gap-2 md:gap-4 min-w-[640px]">
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isDayHoliday = isHoliday(day);
                  const holidayName = isDayHoliday ? getHolidayName(day) : null;
                  return (
                    <DroppableDay
                      key={day.toISOString()}
                      id={format(day, "yyyy-MM-dd")}
                      className="border rounded-lg p-2 md:p-3 min-h-[280px] md:min-h-[300px]"
                    >
                      <div
                        className="text-center mb-2 md:mb-3 cursor-pointer hover:bg-muted/50 rounded-md p-1 transition-colors"
                        onClick={() => navigate(`/calendar?date=${format(day, "yyyy-MM-dd")}`)}
                      >
                        <div className="font-semibold text-xs md:text-sm">{format(day, "EEEE", { locale: ptBR })}</div>
                        <div className="text-xl md:text-2xl font-bold">{format(day, "dd", { locale: ptBR })}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">
                          {format(day, "MMM", { locale: ptBR })}
                        </div>
                        <Badge variant="secondary" className="mt-1 text-[9px] md:text-[10px] px-1.5 py-0.5">
                          {dayAppointments.length} {dayAppointments.length === 1 ? "atendimento" : "atendimentos"}
                        </Badge>
                        {isDayHoliday && holidayName && (
                          <Badge
                            variant="destructive"
                            className="mt-1 md:mt-2 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 flex items-center gap-1 justify-center w-full"
                          >
                            <PartyPopper className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            <span className="truncate">{holidayName}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        {dayAppointments.length === 0 ? (
                          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3 md:py-4">
                            Nenhum agendamento
                          </p>
                        ) : (
                          dayAppointments.map((apt) => (
                            <DraggableAppointmentCard
                              key={apt.id}
                              id={apt.id}
                              backgroundColor={
                                apt.agents && apt.agents.length > 0 && apt.agents[0].color
                                  ? `${apt.agents[0].color}15`
                                  : "hsl(var(--primary) / 0.1)"
                              }
                              borderColor={
                                apt.agents && apt.agents.length > 0 && apt.agents[0].color
                                  ? apt.agents[0].color
                                  : "hsl(var(--primary) / 0.2)"
                              }
                            >
                              <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                {canEdit("dashboard") && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 md:h-6 md:w-6 bg-background/80 hover:bg-background"
                                      onClick={() => handleEditAppointment(apt.id)}
                                    >
                                      <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 md:h-6 md:w-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={() => handleDeleteAppointment(apt.id)}
                                    >
                                      <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Cliente / Ticket:</div>
                                  <div className="font-semibold truncate text-[10px] md:text-xs">{apt.title}</div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Cidade:</div>
                                  <div className="text-muted-foreground truncate text-[10px] md:text-xs">
                                    {apt.city}
                                  </div>
                                </div>
                                <div></div>
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Agente:</div>
                                  <div className="text-muted-foreground text-[10px] md:text-xs">
                                    {apt.agents && apt.agents.length > 0
                                      ? apt.agents.map((agent, idx) => (
                                          <div key={idx} className="truncate">
                                            {agent.name}
                                          </div>
                                        ))
                                      : "Não atribuído"}
                                  </div>
                                </div>
                              </div>
                            </DraggableAppointmentCard>
                          ))
                        )}
                      </div>
                    </DroppableDay>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Folgas e Férias - Terceira linha */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Umbrella className="h-4 w-4 md:h-5 md:w-5" />
                Folgas da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.weekTimeOffs.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                  Nenhuma folga cadastrada para esta semana
                </p>
              ) : (
                <div className="space-y-1.5 md:space-y-2">
                  {weekDays.map((day) => {
                    const dayTimeOffs = getTimeOffsForDay(day);
                    if (dayTimeOffs.length === 0) return null;

                    return (
                      <div key={day.toISOString()} className="border rounded-lg p-2 md:p-3">
                        <div className="font-semibold text-xs md:text-sm mb-1.5 md:mb-2">
                          {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                          {dayTimeOffs.map((timeOff) => (
                            <div
                              key={timeOff.id}
                              className="border border-dashed rounded p-1.5 md:p-2 text-xs bg-muted/30"
                            >
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                <Umbrella className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                                <span className="font-medium text-[10px] md:text-xs">
                                  {timeOff.agents?.name || "Geral"}
                                </span>
                              </div>
                              <Badge
                                variant={timeOff.type === "completa" ? "default" : "secondary"}
                                className="text-[9px] md:text-[10px]"
                              >
                                {timeOff.type === "completa" ? "Folga Completa" : "Folga Parcial"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                Férias Programadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.vacations.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                  Nenhuma férias programada
                </p>
              ) : (
                <div className="space-y-1.5 md:space-y-2 max-h-[300px] overflow-y-auto">
                  {stats.vacations.map((vacation) => {
                    const today = new Date();
                    const startDate = parseISO(vacation.start_date);
                    const daysUntilStart = differenceInDays(startDate, today);

                    let cardColorClass = "bg-muted/30 border-border";
                    if (daysUntilStart <= 30) {
                      cardColorClass = "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
                    } else if (daysUntilStart <= 60) {
                      cardColorClass = "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700";
                    }

                    return (
                      <div key={vacation.id} className={`border rounded p-2 md:p-3 text-xs ${cardColorClass}`}>
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                          <CalendarDays className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                          <span className="font-semibold text-[10px] md:text-xs">
                            {vacation.agents?.name || "Agente não definido"}
                          </span>
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground space-y-0.5">
                          <div>
                            <span className="font-medium">Início:</span> {format(startDate, "dd/MM/yyyy")}
                          </div>
                          <div>
                            <span className="font-medium">Fim:</span>{" "}
                            {format(parseISO(vacation.end_date), "dd/MM/yyyy")}
                          </div>
                          <div>
                            <span className="font-medium">Dias:</span> {vacation.days || "-"}
                          </div>
                        </div>
                        <Badge
                          variant={
                            daysUntilStart <= 30 ? "destructive" : daysUntilStart <= 60 ? "secondary" : "outline"
                          }
                          className="mt-1.5 text-[9px] md:text-[10px]"
                        >
                          {daysUntilStart <= 0 ? "Em andamento" : `${daysUntilStart} dias restantes`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DndContext>
  );
}
