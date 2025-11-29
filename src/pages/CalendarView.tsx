import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Edit, Trash2, PartyPopper, GripVertical } from "lucide-react";
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
  agents?: Array<{ name: string; color: string | null }>;
  vehicles?: { model: string; plate: string };
}

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    loadAppointments();
  }, [currentMonth]);

  const loadAppointments = async () => {
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          vehicles(model, plate)
        `,
        )
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
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

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks
      .map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weekDays = days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6); // Monday to Friday

        // Filtrar apenas dias que pertencem ao mês atual
        const daysInMonth = weekDays.filter((day) => {
          const dayMonth = day.getMonth();
          const currentMonthNum = currentMonth.getMonth();
          return dayMonth === currentMonthNum;
        });

        return daysInMonth;
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
          <div className="text-center flex-1">
            <p className="text-xs md:text-sm text-muted-foreground">Mês de</p>
            <p className="font-semibold text-base md:text-lg">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {monthWeeks.map((weekDays, weekIndex) => {
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-2 md:gap-x-3 gap-y-1.5 md:gap-y-2">
                                  <div>
                                    <div className="font-medium text-[9px] md:text-[11px]">Cliente / Ticket:</div>
                                    <div className="font-semibold truncate text-xs md:text-sm">{apt.title}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-[9px] md:text-[11px]">Cidade:</div>
                                    <div className="text-muted-foreground truncate text-xs md:text-sm">{apt.city}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-[9px] md:text-[11px]">Data:</div>
                                    <div className="text-muted-foreground text-xs md:text-sm">
                                      {format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-[9px] md:text-[11px]">Horário:</div>
                                    <div className="text-muted-foreground text-xs md:text-sm">{apt.time}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-[9px] md:text-[11px]">Agente:</div>
                                    <div className="text-muted-foreground space-y-0.5 text-xs md:text-sm">
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
                                    <div className="font-medium text-[9px] md:text-[11px]">Veículo:</div>
                                    <div className="truncate text-xs md:text-sm text-vehicle-name font-semibold">
                                      {apt.vehicles ? `${apt.vehicles.model}` : "N/A"}
                                    </div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="font-medium text-[9px] md:text-[11px]">Despesas:</div>
                                    <Badge 
                                      className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 mt-0.5 border-0 ${
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
                                    <div className="md:col-span-3">
                                      <div className="font-medium text-[9px] md:text-[11px]">Observações:</div>
                                      <div className="text-muted-foreground line-clamp-1 text-xs md:text-sm">{apt.description}</div>
                                    </div>
                                  )}
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
        </div>
      </div>
    </DndContext>
  );
}
