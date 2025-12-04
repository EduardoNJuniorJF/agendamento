import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from "react-router-dom";
import {
  format,
  addMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  addWeeks,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Edit, Trash2, PartyPopper, GripVertical, AlertTriangle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  status: string;
  description?: string;
  expense_status: string;
  is_penalized?: boolean;
  created_by_name?: string;
  updated_by_name?: string;
  last_action?: string;
  last_action_at?: string;
  agents?: Array<{ name: string; color: string | null }>;
  vehicles?: { model: string; plate: string };
}

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, role } = useAuth();
  const isAdmin = role === "admin" || role === "dev";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    loadAppointments();
  }, [currentMonth, currentWeek, viewMode]);

  const loadAppointments = async () => {
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(currentMonth);
        endDate = endOfMonth(currentMonth);
      } else {
        startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
        endDate = addDays(startDate, 4); // Monday to Friday
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          vehicles(model, plate)
        `,
        )
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("date")
        .order("time");

      if (error) throw error;

      // Load agents for each appointment
      const appointmentsWithAgents = await Promise.all(
        (data || []).map(async (apt) => {
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

      setAppointments(appointmentsWithAgents);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const monday = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  };

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    // Filtra as semanas para remover a primeira se ela começar no mês anterior
    const filteredWeeks = weeks.filter((weekStart, index) => {
      // Se for a primeira semana (index === 0) e ela começar antes do mês atual, a ignoramos.
      if (index === 0 && weekStart.getMonth() !== currentMonth.getMonth()) {
        return false; // Ignora a semana
      }
      return true; // Mantém as outras semanas
    });

    return filteredWeeks
      .map((weekStart, index, array) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weekDays = days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6); // Monday to Friday

        // Retorna os 5 dias úteis (segunda a sexta) da semana.
        return weekDays;
      })
      .filter((week) => week.length > 0); // Remover semanas vazias
  };

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.date === dayStr);
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

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir agendamento", variant: "destructive" });
      return;
    }

    toast({ title: "Agendamento excluído com sucesso!" });
    loadAppointments();
  };

  const handleEditAppointment = (id: string) => {
    navigate(`/new-appointment?edit=${id}`);
  };

  const handleTogglePenalty = async (id: string, currentValue: boolean) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("appointments")
      .update({ is_penalized: !currentValue })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao alterar penalidade", variant: "destructive" });
      return;
    }

    toast({ title: currentValue ? "Penalidade removida" : "Penalidade aplicada" });
    loadAppointments();
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
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (!appointment || appointment.date === newDate) return;

    try {
      // Update appointment date in database
      const { error } = await supabase.from("appointments").update({ date: newDate }).eq("id", appointmentId);

      if (error) throw error;

      toast({ title: "Agendamento movido com sucesso!" });
      loadAppointments(); // Reload to reflect changes
    } catch (error) {
      console.error("Error moving appointment:", error);
      toast({
        title: "Erro ao mover agendamento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando calendário...</div>;
  }

  const monthWeeks = getMonthWeeks();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendário</h1>
            <p className="text-sm md:text-base text-muted-foreground">Visualize todos os agendamentos</p>
          </div>
          {canEdit("calendar") && <Button onClick={() => navigate("/new-appointment")} size="sm" className="w-full sm:w-auto">Novo Agendamento</Button>}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between bg-card rounded-lg border p-3 md:p-4 gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value: "month" | "week") => {
                if (value) setViewMode(value);
              }}
              className="h-8"
            >
              <ToggleGroupItem value="month" aria-label="Visualizar por Mês" className="h-8 text-xs">
                Mês
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Visualizar por Semana" className="h-8 text-xs">
                Semana
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                {viewMode === "month" ? "Mês de" : "Semana de"}
              </p>
              <p className="font-semibold text-base md:text-lg">
                {viewMode === "month"
                  ? format(currentMonth, "MMMM yyyy", { locale: ptBR })
                  : `${format(currentWeek, "dd/MM", { locale: ptBR })} - ${format(
                      addWeeks(currentWeek, 1),
                      "dd/MM",
                      { locale: ptBR },
                    )}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() =>
                viewMode === "month"
                  ? setCurrentMonth(addMonths(currentMonth, -1))
                  : setCurrentWeek(addWeeks(currentWeek, -1))
              }
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setCurrentMonth(new Date());
              setCurrentWeek(new Date());
            }}>
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() =>
                viewMode === "month"
                  ? setCurrentMonth(addMonths(currentMonth, 1))
                  : setCurrentWeek(addWeeks(currentWeek, 1))
              }
            >
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {viewMode === "month" ? (
            // Layout de Mês (Atual)
            monthWeeks.map((weekDays, weekIndex) => {
            if (weekDays.length === 0) return null;
            return (
              <div key={weekIndex} className="space-y-2 md:space-y-3">
                <div className="bg-muted/50 rounded-lg px-3 md:px-4 py-1.5 md:py-2">
                  <h3 className="font-semibold text-xs md:text-sm">
                    Semana {weekIndex + 1} - de {format(weekDays[0], "dd/MM", { locale: ptBR })} a{" "}
                    {format(weekDays[weekDays.length - 1], "dd/MM", { locale: ptBR })}
                  </h3>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div
                    className="grid gap-2 md:gap-4 min-w-[640px]"
                    style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
                  >
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    const isDayHoliday = isHoliday(day);
                    const holidayName = isDayHoliday ? getHolidayName(day) : null;
                    return (
                      <DroppableDay
                        key={day.toISOString()}
                        id={format(day, "yyyy-MM-dd")}
                        className="bg-card rounded-lg border p-2 md:p-4 min-h-[200px]"
                      >
                        <div className="mb-2 md:mb-4 text-center">
                          <div className="text-xs md:text-sm text-muted-foreground">{format(day, "EEEE", { locale: ptBR })}</div>
                          <div className="text-base md:text-lg font-semibold">{format(day, "dd/MM", { locale: ptBR })}</div>
                          {isDayHoliday && holidayName && (
                            <Badge
                              variant="destructive"
                              className="mt-1 md:mt-2 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 flex items-center gap-1 justify-center"
                            >
                              <PartyPopper className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              <span className="truncate">{holidayName}</span>
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          {dayAppointments.length === 0 ? (
                            <p className="text-xs md:text-sm text-muted-foreground text-center py-3 md:py-4">Sem agendamentos</p>
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
                                  {canEdit("calendar") && (
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
                                <div className="space-y-1.5">
                                  {/* Apenas Cliente/Ticket e Cidade */}
                                  <div className="flex gap-4">
                                    <div>
                                      <div className="font-medium text-[9px] md:text-[10px]">Cliente / Ticket:</div>
                                      <div className="font-semibold truncate text-[10px] md:text-xs">{apt.title}</div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-[9px] md:text-[10px]">Cidade:</div>
                                      <div className="text-muted-foreground truncate text-[10px] md:text-xs">{apt.city}</div>
                                    </div>
                                  </div>
                                </div>
                                  {/* Penalty Badge */}
                                  <div 
                                    className={`flex items-center gap-1 mt-1 ${isAdmin ? 'cursor-pointer' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isAdmin) handleTogglePenalty(apt.id, apt.is_penalized || false);
                                    }}
                                    title={isAdmin ? "Clique para alternar penalidade" : "Somente administradores podem alterar"}
                                  >
                                    <div className="font-medium text-[9px] md:text-[10px]">Penalidade:</div>
                                    {apt.is_penalized ? (
                                      <Badge 
                                        variant="destructive" 
                                        className="text-[8px] md:text-[9px] px-1 py-0.5 flex items-center gap-0.5"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        Sim
                                      </Badge>
                                    ) : (
                                      <Badge 
                                        variant="outline" 
                                        className="text-[8px] md:text-[9px] px-1 py-0.5 bg-green-100 text-green-800 border-green-300"
                                      >
                                        Não
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Audit Info */}
                                  <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/30">
                                    <div className="flex items-center gap-1 text-[8px] md:text-[9px] text-muted-foreground">
                                      <User className="h-2.5 w-2.5" />
                                      {apt.last_action === "updated" && apt.updated_by_name ? (
                                        <span>Alterado por <strong>{apt.updated_by_name}</strong></span>
                                      ) : apt.created_by_name ? (
                                        <span>Incluído por <strong>{apt.created_by_name}</strong></span>
                                      ) : (
                                        <span>Sem informação de autor</span>
                                      )}
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
              </div>
            );
          })}
          ) : (
            // Layout de Semana (Vertical)
            getWeekDays().map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isDayHoliday = isHoliday(day);
              const holidayName = isDayHoliday ? getHolidayName(day) : null;
              return (
                <DroppableDay
                  key={day.toISOString()}
                  id={format(day, "yyyy-MM-dd")}
                  className="bg-card rounded-lg border p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 items-start"
                >
                  {/* Coluna de Informação do Dia */}
                  <div className="flex-shrink-0 w-full md:w-32 text-center md:text-left">
                    <div className="text-xs md:text-sm text-muted-foreground">{format(day, "EEEE", { locale: ptBR })}</div>
                    <div className="text-xl md:text-2xl font-semibold">{format(day, "dd/MM", { locale: ptBR })}</div>
                    {isDayHoliday && holidayName && (
                      <Badge
                        variant="destructive"
                        className="mt-1 text-[9px] md:text-[10px] px-1.5 py-0.5 flex items-center gap-1 justify-center w-full md:w-auto"
                      >
                        <PartyPopper className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        <span className="truncate">{holidayName}</span>
                      </Badge>
                    )}
                  </div>

                  {/* Coluna de Agendamentos (Horizontal) */}
                  <div className="flex-1 w-full overflow-x-auto pb-2">
                    <div className="flex gap-3 md:gap-4 min-w-full">
                      {dayAppointments.length === 0 ? (
                        <p className="text-xs md:text-sm text-muted-foreground py-3 md:py-4 flex-shrink-0">Sem agendamentos</p>
                      ) : (
                        dayAppointments.map((apt) => (
                          <DraggableAppointmentCard
                            key={apt.id}
                            id={apt.id}
                            className="w-64 flex-shrink-0" // Define largura fixa para o card
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
                            {/* Conteúdo do Card de Semana (Completo) */}
                            <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              {canEdit("calendar") && (
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
                            <div className="space-y-1.5">
                              <div>
                                <div className="font-medium text-[9px] md:text-[10px]">Cliente / Ticket:</div>
                                <div className="font-semibold truncate text-[10px] md:text-xs">{apt.title}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Cidade:</div>
                                  <div className="text-muted-foreground truncate text-[10px] md:text-xs">{apt.city}</div>
                                </div>
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Horário:</div>
                                  <div className="text-muted-foreground text-[10px] md:text-xs">{apt.time}</div>
                                </div>
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
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Veículo:</div>
                                  <div className="truncate text-[10px] md:text-xs text-vehicle-name font-semibold">
                                    {apt.vehicles ? `${apt.vehicles.model}` : "N/A"}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-[9px] md:text-[10px]">Despesas:</div>
                                <Badge 
                                  className={`text-[8px] md:text-[9px] px-1 py-0.5 mt-0.5 border-0 ${
                                    apt.expense_status === 'separar_dia_anterior' 
                                      ? 'bg-expense-previous-day text-expense-previous-day-foreground' 
                                      : apt.expense_status === 'separar_dinheiro'
                                      ? 'bg-expense-money text-expense-money-foreground'
                                      : 'bg-expense-no-separate text-expense-no-separate-foreground'
                                  }`}
                                >
                                  {getExpenseLabel(apt.expense_status)}
                                </Badge>
                              </div>
                              {apt.description && (
                                <div>
                                  <div className="font-medium text-[9px] md:text-[10px]">Observações:</div>
                                  <div className="text-muted-foreground line-clamp-2 text-[10px] md:text-xs">{apt.description}</div>
                                </div>
                              )}
                            </div>
                          </DraggableAppointmentCard>
                        ))
                      )}
                    </div>
                  </div>
                </DroppableDay>
              );
            })
          )}
        </div>
      </div>
    </DndContext>
  );
}
