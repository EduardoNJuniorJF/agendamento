// Componente principal para visualização de calendário de agendamentos.
// Utiliza React, Supabase para dados, e dnd-kit para funcionalidade Drag and Drop.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  format,
  addMonths,
  addWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  PartyPopper,
  GripVertical,
  AlertTriangle,
  User,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isHoliday, getHolidayName, LocalHolidayData } from "@/lib/holidays";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Interface que define a estrutura de um Agendamento (Appointment)
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
  appointment_type?: string | null;
  agents?: Array<{ name: string; color: string | null }>;
  vehicles?: { model: string; plate: string };
}

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [localHolidays, setLocalHolidays] = useState<LocalHolidayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canEditCalendar, role, userName, sector } = useAuth();
  const isAdmin = role === "admin" || role === "dev";
  
  // Administrativo não pode editar (apenas visualizar)
  const canEditPage = canEditCalendar();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    loadAppointments();
    loadLocalHolidays();
  }, [currentMonth, viewMode]);

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

  const loadAppointments = async () => {
    setLoading(true);
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

  const getCurrentWeekDays = () => {
    const startDay = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const endDay = endOfWeek(currentMonth, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDay, end: endDay });
    return days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
  };

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks
      .map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        return days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
      })
      .filter((week) => week.length > 0);
  };

  // Handler para editar agendamento
  const handleEditAppointment = (id: string) => {
    navigate(`/new-appointment?id=${id}`);
  };

  // Handler para excluir agendamento
  const handleDeleteAppointment = async (id: string) => {
    setAppointmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    try {
      // Primeiro, excluir os registros relacionados em appointment_agents
      await supabase
        .from("appointment_agents")
        .delete()
        .eq("appointment_id", appointmentToDelete);

      // Depois, excluir o agendamento
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentToDelete);

      if (error) throw error;

      toast({ title: "Agendamento excluído com sucesso!" });
      loadAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({ title: "Erro ao excluir agendamento", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  const renderAppointmentCardContent = (apt: Appointment, isSummary: boolean) => {
    if (isSummary) {
      return (
        <div className="space-y-1.5">
          <div>
            <div className="font-medium text-[9px] md:text-[10px]">Cliente / Ticket:</div>
            <div className="font-semibold truncate text-[10px] md:text-xs">{apt.title}</div>
          </div>
          <div>
            <div className="font-medium text-[9px] md:text-[10px]">Cidade:</div>
            <div className="text-muted-foreground truncate text-[10px] md:text-xs">{apt.city}</div>
          </div>

          {apt.agents && apt.agents.length > 0 && (
            <div>
              <div className="font-medium text-[9px] md:text-[10px]">Agente{apt.agents.length > 1 ? "s" : ""}:</div>
              <div className="text-muted-foreground text-[10px] md:text-xs space-y-0.5">
                {apt.agents.map((agent, index) => (
                  <div key={index} className="truncate">
                    {agent.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <div>
          <div className="font-medium text-xs text-muted-foreground">Horário:</div>
          <div className="font-semibold text-sm md:text-base">{apt.time}</div>
        </div>
        <div>
          <div className="font-medium text-xs text-muted-foreground">Cliente / Ticket:</div>
          <div className="font-semibold truncate text-sm">{apt.title}</div>
        </div>
        <div>
          <div className="font-medium text-xs text-muted-foreground">Cidade:</div>
          <div className="text-muted-foreground truncate text-sm">{apt.city}</div>
        </div>
        {apt.agents && apt.agents.length > 0 && (
          <div>
            <div className="font-medium text-xs text-muted-foreground">Agentes:</div>
            <div className="flex flex-wrap gap-1">
              {apt.agents.map((agent) => (
                <Badge
                  key={agent.name}
                  variant="outline"
                  className="text-[9px] md:text-[10px] px-1.5 py-0.5"
                >
                  {agent.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {apt.vehicles && (
          <div>
            <div className="font-medium text-xs text-muted-foreground">Veículo:</div>
            <div className="truncate text-sm" style={{ color: "#ffa100" }}>
              {apt.vehicles.model} ({apt.vehicles.plate})
            </div>
          </div>
        )}
        {apt.appointment_type && (
          <div>
            <div className="font-medium text-xs text-muted-foreground">Status:</div>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0.5"
              style={{
                backgroundColor: getStatusColor(apt.appointment_type),
                color: getStatusTextColor(apt.appointment_type),
              }}
            >
              {apt.appointment_type}
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {apt.status === "completed" && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-800 border-green-300"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          )}
          {apt.is_penalized && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Penalizado
            </Badge>
          )}
        </div>
        <div className="pt-1">
          <div className="font-medium text-[9px] text-muted-foreground mb-1">Despesas:</div>
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0.5"
            style={{
              backgroundColor: getExpenseColor(apt.expense_status),
              color: getExpenseTextColor(apt.expense_status),
            }}
          >
            {getExpenseLabel(apt.expense_status)}
          </Badge>
        </div>

        {/* Informação de quem criou/editou */}
        <div className="pt-1 border-t border-border/50 mt-1">
          {apt.last_action === "created" && apt.created_by_name && (
            <div className="text-[9px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              Incluído por {apt.created_by_name}
            </div>
          )}
          {apt.last_action === "updated" && apt.updated_by_name && (
            <div className="text-[9px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              Alterado por {apt.updated_by_name}
            </div>
          )}
          {apt.last_action === "deleted" && apt.updated_by_name && (
            <div className="text-[9px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              Excluído por {apt.updated_by_name}
            </div>
          )}
          {!apt.last_action && apt.created_by_name && (
            <div className="text-[9px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              Incluído por {apt.created_by_name}
            </div>
          )}
        </div>

        {isAdmin && canEditPage && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 ${apt.status === "completed" ? "bg-green-500/80 hover:bg-green-600" : "hover:bg-green-200"}`}
              title={apt.status === "completed" ? "Marcar como Agendado" : "Marcar como Concluído"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCompleted(apt.id, apt.status);
              }}
            >
              <CheckCircle2 className={`h-3 w-3 ${apt.status === "completed" ? "text-white" : "text-green-600"}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 ${apt.is_penalized ? "bg-destructive/80 hover:bg-destructive" : "hover:bg-destructive/20"}`}
              title={apt.is_penalized ? "Remover Penalidade" : "Penalizar"}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePenalty(apt.id, apt.is_penalized || false);
              }}
            >
              <AlertTriangle
                className={`h-3 w-3 ${apt.is_penalized ? "text-destructive-foreground" : "text-destructive"}`}
              />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case "Agendar/Ligar": return "#6366f1"; // indigo
      case "Bug": return "#ef4444"; // red
      case "Configuração": return "#8b5cf6"; // violet
      case "Conversão": return "#22c55e"; // green
      case "Entrega": return "#f59e0b"; // amber
      case "Etapa 1": return "#3b82f6"; // blue
      case "Etapa 2": return "#0ea5e9"; // sky
      case "Etapa 3": return "#06b6d4"; // cyan
      case "Filial": return "#ec4899"; // pink
      case "Material": return "#f97316"; // orange
      case "Reciclagem": return "#14b8a6"; // teal
      case "Retorno": return "#a855f7"; // purple
      case "Reunião": return "#eab308"; // yellow
      case "Rota": return "#64748b"; // slate
      case "Treinamento": return "#10b981"; // emerald
      default: return "#6b7280"; // gray
    }
  };

  const getStatusTextColor = (type: string) => {
    switch (type) {
      case "Reunião": return "#000000"; // yellow needs dark text
      default: return "#ffffff";
    }
  };

  const getExpenseColor = (status: string) => {
    switch (status) {
      case "separar_dia_anterior":
        return "#11734b";
      case "separar_dinheiro":
        return "#d4edbc";
      case "não_separar":
        return "#ffcfc9";
      default:
        return "transparent";
    }
  };

  const getExpenseTextColor = (status: string) => {
    switch (status) {
      case "separar_dia_anterior":
        return "white";
      case "separar_dinheiro":
        return "black";
      case "não_separar":
        return "black";
      default:
        return "inherit";
    }
  };

  const getExpenseLabel = (status: string) => {
    switch (status) {
      case "separar_dia_anterior":
        return "Separar (Dia Anterior)";
      case "separar_dinheiro":
        return "Separar (Dinheiro)";
      case "não_separar":
        return "Não Separar";
      default:
        return "Status Desconhecido";
    }
  };

  const handleToggleCompleted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "scheduled" : "completed";
    const { error } = await supabase
      .from("appointments")
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        updated_by_name: userName,
        last_action: "updated",
        last_action_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: `Agendamento ${newStatus === "completed" ? "concluído" : "reagendado"} com sucesso!` });
      loadAppointments();
    }
  };

  const handleTogglePenalty = async (id: string, isPenalized: boolean) => {
    const { error } = await supabase
      .from("appointments")
      .update({ 
        is_penalized: !isPenalized, 
        updated_at: new Date().toISOString(),
        updated_by_name: userName,
        last_action: "updated",
        last_action_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar penalidade", variant: "destructive" });
    } else {
      toast({ title: `Penalidade ${!isPenalized ? "aplicada" : "removida"} com sucesso!` });
      loadAppointments();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const newDate = over.id as string;
      const appointmentId = active.id as string;

      const { error } = await supabase
        .from("appointments")
        .update({ 
          date: newDate, 
          updated_at: new Date().toISOString(),
          updated_by_name: userName,
          last_action: "updated",
          last_action_at: new Date().toISOString()
        })
        .eq("id", appointmentId);

      if (error) {
        toast({ title: "Erro ao reagendar", variant: "destructive" });
      } else {
        toast({ title: "Agendamento reagendado com sucesso!" });
        loadAppointments();
      }
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    const dayString = format(day, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.date === dayString).sort((a, b) => (a.time > b.time ? 1 : -1));
  };

  const renderMonthView = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {getMonthWeeks().map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-5 gap-2 md:gap-4">
          {week.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isDayHoliday = isHoliday(day, localHolidays);
            const holidayName = isDayHoliday ? getHolidayName(day, localHolidays) : null;

            return (
              <DroppableDay
                key={day.toISOString()}
                id={format(day, "yyyy-MM-dd")}
                className={`min-h-[120px] p-2 border rounded-lg transition-colors ${
                  isDayHoliday ? "bg-red-50/50 border-red-200" : "bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isDayHoliday ? "text-red-600" : "text-foreground"}`}>
                    {format(day, "dd/MM")}
                  </span>
                  {isDayHoliday && holidayName && (
                    <Badge variant="destructive" className="text-[8px] px-1 py-0">
                      {holidayName}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {dayAppointments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">Sem agendamentos</p>
                  ) : (
                    dayAppointments.map((apt) => (
                      <DraggableAppointmentCard
                        key={apt.id}
                        id={apt.id}
                        className="p-1 text-xs cursor-grab"
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
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEditPage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 md:h-6 md:w-6 bg-background/80 hover:bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAppointment(apt.id);
                                }}
                              >
                                <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAppointment(apt.id);
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        {renderAppointmentCardContent(apt, true)}
                      </DraggableAppointmentCard>
                    ))
                  )}
                </div>
              </DroppableDay>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderWeekView = () => (
    <div className="space-y-4 md:space-y-6">
      {getCurrentWeekDays().map((day) => {
        const dayAppointments = getAppointmentsForDay(day);
        const isDayHoliday = isHoliday(day, localHolidays);
        const holidayName = isDayHoliday ? getHolidayName(day, localHolidays) : null;

        return (
          <div key={day.toISOString()} className="flex flex-col md:flex-row bg-card rounded-lg border p-2 md:p-4">
            <div className="flex-shrink-0 w-full md:w-40 mb-2 md:mb-0 md:mr-4 text-center md:text-left">
              <div className="text-xs md:text-sm text-muted-foreground">{format(day, "EEEE", { locale: ptBR })}</div>
              <div className="text-base md:text-lg font-semibold">{format(day, "dd/MM", { locale: ptBR })}</div>
              {isDayHoliday && holidayName && (
                <Badge
                  variant="destructive"
                  className="mt-1 md:mt-2 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 flex items-center gap-1 justify-center md:justify-start"
                >
                  <PartyPopper className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="truncate">{holidayName}</span>
                </Badge>
              )}
            </div>

            <DroppableDay
              id={format(day, "yyyy-MM-dd")}
              className="flex-1 flex overflow-x-auto pb-2 space-x-3 md:space-x-4"
            >
              {dayAppointments.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground self-center whitespace-nowrap">
                  Sem agendamentos
                </p>
              ) : (
                dayAppointments.map((apt) => (
                  <DraggableAppointmentCard
                    key={apt.id}
                    id={apt.id}
                    className="flex-shrink-0 w-64"
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
                      {canEditPage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 md:h-6 md:w-6 bg-background/80 hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(apt.id);
                            }}
                          >
                            <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 md:h-6 md:w-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAppointment(apt.id);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    {renderAppointmentCardContent(apt, false)}
                  </DraggableAppointmentCard>
                ))
              )}
            </DroppableDay>
          </div>
        );
      })}
    </div>
  );

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
          {canEditPage && (
            <Button onClick={() => navigate("/new-appointment")} size="sm" className="w-full sm:w-auto">
              Novo Agendamento
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between bg-card rounded-lg border p-3 md:p-4 gap-3">
          <div className="flex items-center rounded-md border p-1">
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")}>
              Semana
            </Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")}>
              Mês
            </Button>
          </div>

          <div className="text-center flex-1">
            <p className="text-xs md:text-sm text-muted-foreground">{viewMode === "month" ? "Mês de" : "Semana de"}</p>
            <p className="font-semibold text-base md:text-lg">
              {viewMode === "month"
                ? format(currentMonth, "MMMM yyyy", { locale: ptBR })
                : `de ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })} a ${format(endOfWeek(currentMonth, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })}`}
            </p>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() =>
                setCurrentMonth(viewMode === "month" ? addMonths(currentMonth, -1) : addWeeks(currentMonth, -1))
              }
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() =>
                setCurrentMonth(viewMode === "month" ? addMonths(currentMonth, 1) : addWeeks(currentMonth, 1))
              }
            >
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        {viewMode === "month" ? renderMonthView() : renderWeekView()}

        <DragOverlay>
          {activeId ? (
            <DraggableAppointmentCard id={activeId} isOverlay>
              {renderAppointmentCardContent(appointments.find((apt) => apt.id === activeId)!, viewMode === "month")}
            </DraggableAppointmentCard>
          ) : null}
        </DragOverlay>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAppointment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
