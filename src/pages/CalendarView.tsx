// Componente principal para visualização de calendário de agendamentos.
// Utiliza React, Supabase para dados, e dnd-kit para funcionalidade Drag and Drop.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Integração com o Supabase
import { Badge } from "@/components/ui/badge"; // Componente de Badge (etiqueta)
import { Button } from "@/components/ui/button"; // Componente de Botão
import { useNavigate } from "react-router-dom"; // Hook para navegação
import {
  format, // Formatação de datas
  addMonths, // Adicionar meses
  addWeeks, // Adicionar semanas
  startOfWeek, // Início da semana
  endOfWeek, // Fim da semana
  eachDayOfInterval, // Iterar sobre dias em um intervalo
  parseISO, // Converter string ISO para objeto Date
  startOfMonth, // Início do mês
  endOfMonth, // Fim do mês
  eachWeekOfInterval, // Iterar sobre semanas em um intervalo
} from "date-fns";
import { ptBR } from "date-fns/locale"; // Localização para Português do Brasil
import {
  ChevronLeft, // Ícone de seta para esquerda (navegação)
  ChevronRight, // Ícone de seta para direita (navegação)
  Edit, // Ícone de edição
  Trash2, // Ícone de lixeira (exclusão)
  PartyPopper, // Ícone de feriado
  GripVertical, // Ícone de arrastar (DND)
  AlertTriangle, // Ícone de alerta (penalidade)
  User, // Ícone de usuário/agente
  CheckCircle2, // Ícone de conclusão
} from "lucide-react"; // Biblioteca de ícones
import { useToast } from "@/hooks/use-toast"; // Hook para exibir notificações (toasts)
import { isHoliday, getHolidayName } from "@/lib/holidays"; // Funções utilitárias para verificar feriados
import { useAuth } from "@/contexts/AuthContext"; // Contexto de autenticação para permissões
import {
  DndContext, // Contexto principal do Drag and Drop
  DragEndEvent, // Tipo de evento ao finalizar o arrasto
  DragOverlay, // Overlay visual durante o arrasto
  DragStartEvent, // Tipo de evento ao iniciar o arrasto
  closestCenter, // Estratégia de detecção de colisão (centro mais próximo)
  PointerSensor, // Sensor para interações com mouse/touch
  useSensor, // Hook para criar sensores
  useSensors, // Hook para agrupar sensores
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DraggableAppointmentCard } from "@/components/DraggableAppointmentCard";
import { DroppableDay } from "@/components/DroppableDay";

// Interface que define a estrutura de um Agendamento (Appointment)
interface Appointment {
  id: string;
  title: string;
  city: string;
  date: string;
  time: string;
  status: string; // Ex: 'scheduled', 'completed'
  description?: string;
  expense_status: string; // Status da despesa
  is_penalized?: boolean; // Se o agendamento foi penalizado
  created_by_name?: string;
  updated_by_name?: string;
  last_action?: string;
  last_action_at?: string;
  agents?: Array<{ name: string; color: string | null }>; // Agentes associados
  vehicles?: { model: string; plate: string }; // Veículo associado
}

export default function CalendarView() {
  // --- ESTADOS DO COMPONENTE ---
  const [appointments, setAppointments] = useState<Appointment[]>([]); // Lista de agendamentos
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Data atual para navegação (mês/semana)
  const [viewMode, setViewMode] = useState<"month" | "week">("week"); // Modo de visualização: 'month' ou 'week'
  const [activeId, setActiveId] = useState<string | null>(null); // ID do item sendo arrastado (para DND)

  // --- HOOKS E CONTEXTOS ---
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, role } = useAuth(); // Permissões do usuário
  const isAdmin = role === "admin" || role === "dev"; // Verificação de administrador

  // Configuração dos sensores para Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distância mínima para iniciar o arrasto
      },
    }),
  );

  // --- EFEITOS E CARREGAMENTO DE DADOS ---

  // Efeito para carregar agendamentos sempre que o mês ou modo de visualização mudar
  useEffect(() => {
    loadAppointments();
  }, [currentMonth, viewMode]);

  // Função assíncrona para buscar agendamentos no Supabase
  const loadAppointments = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // 1. Busca principal de agendamentos e veículos associados
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          vehicles(model, plate)
        `,
        )
        // Filtra agendamentos dentro do mês atual
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date")
        .order("time");

      if (error) throw error;

      // 2. Busca agentes associados a cada agendamento (necessário devido à relação N:N)
      const appointmentsWithAgents = await Promise.all(
        (data || []).map(async (apt) => {
          const { data: agentData } = await supabase
            .from("appointment_agents")
            .select("agents(name, color)")
            .eq("appointment_id", apt.id);

          return {
            ...apt,
            // Mapeia e filtra os dados dos agentes
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

  // --- FUNÇÕES DE UTILIDADE DE DATA ---

  // Retorna os dias úteis da semana atual (para a visualização semanal)
  const getCurrentWeekDays = () => {
    const startDay = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Começa na segunda
    const endDay = endOfWeek(currentMonth, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDay, end: endDay });
    // Filtra fins de semana (domingo=0, sábado=6)
    return days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
  };

  // Retorna as semanas do mês atual (para a visualização mensal)
  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Obtém o intervalo de semanas no mês
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks
      .map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        // Obtém os dias úteis de cada semana
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        return days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
      })
      .filter((week) => week.length > 0); // Remove semanas vazias
  };

  // --- FUNÇÕES DE RENDERIZAÇÃO DE CONTEÚDO ---

  // Renderiza o conteúdo interno do card de agendamento
  const renderAppointmentCardContent = (apt: Appointment, isSummary: boolean) => {
    // Renderização resumida (para a visualização mensal)
    if (isSummary) {
      return (
        <div className="space-y-1.5">
          {/* Detalhes resumidos do agendamento */}
          <div>
            <div className="font-medium text-[9px] md:text-[10px]">Cliente / Ticket:</div>
            <div className="font-semibold truncate text-[10px] md:text-xs">{apt.title}</div>
          </div>
          <div>
            <div className="font-medium text-[9px] md:text-[10px]">Cidade:</div>
            <div className="text-muted-foreground truncate text-[10px] md:text-xs">{apt.city}</div>
          </div>

          {/* Lista de agentes associados */}
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

    // Renderização detalhada (para a visualização semanal e overlay DND)
    return (
      <div className="space-y-1.5">
        {/* Horário */}
        <div>
          <div className="font-medium text-xs text-muted-foreground">Horário:</div>
          <div className="font-semibold text-sm md:text-base">{apt.time}</div>
        </div>
        {/* Cliente / Ticket */}
        <div>
          <div className="font-medium text-xs text-muted-foreground">Cliente / Ticket:</div>
          <div className="font-semibold truncate text-sm">{apt.title}</div>
        </div>
        {/* Cidade */}
        <div>
          <div className="font-medium text-xs text-muted-foreground">Cidade:</div>
          <div className="text-muted-foreground truncate text-sm">{apt.city}</div>
        </div>
        {/* Agentes */}
        {apt.agents && apt.agents.length > 0 && (
          <div>
            <div className="font-medium text-xs text-muted-foreground">Agentes:</div>
            <div className="flex flex-wrap gap-1">
              {apt.agents.map((agent) => (
                <Badge
                  key={agent.name}
                  variant="outline" // Removido o estilo de cor para ser neutro
                  className="text-[9px] md:text-[10px] px-1.5 py-0.5"
                >
                  {agent.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {/* Veículo */}
        {apt.vehicles && (
          <div>
            <div className="font-medium text-xs text-muted-foreground">Veículo:</div>
            <div className="truncate text-sm" style={{ color: "#ffa100" }}>
              {apt.vehicles.model} ({apt.vehicles.plate})
            </div>
          </div>
        )}
        {/* Indicadores de Status */}
        <div className="flex flex-wrap gap-1 pt-1">
          {/* Badge de Concluído */}
          {apt.status === "completed" && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-800 border-green-300"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          )}
          {/* Badge de Penalizado */}
          {apt.is_penalized && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Penalizado
            </Badge>
          )}
        </div>
        {/* Seção de Despesas */}
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
        {/* Botões de Ação Admin (Toggles) */}
        {isAdmin && (
          <div className="flex items-center gap-1 pt-1">
            {/* Toggle de Conclusão */}
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
            {/* Toggle de Penalidade */}
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

  // --- FUNÇÕES DE UTILIDADE DE DESPESAS ---

  // Mapeia o status da despesa para uma cor de fundo
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

  // Mapeia o status da despesa para uma cor de texto
  const getExpenseTextColor = (status: string) => {
    switch (status) {
      case "separar_dia_anterior":
        return "white"; // Para contraste
      case "separar_dinheiro":
        return "black"; // Para contraste
      case "não_separar":
        return "black"; // Para contraste
      default:
        return "inherit";
    }
  };

  // Mapeia o status da despesa para um rótulo legível
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

  // --- HANDLERS DE AÇÃO (TOGGLES) ---

  // Alterna o status de conclusão do agendamento
  const handleToggleCompleted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "scheduled" : "completed"; // Alterna entre concluído e agendado
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: `Agendamento ${newStatus === "completed" ? "concluído" : "reagendado"} com sucesso!` });
      loadAppointments(); // Recarrega os dados para atualizar a UI
    }
  };

  // Alterna o status de penalidade do agendamento
  const handleTogglePenalty = async (id: string, isPenalized: boolean) => {
    const { error } = await supabase
      .from("appointments")
      .update({ is_penalized: !isPenalized, updated_at: new Date().toISOString() }) // Inverte o valor
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar penalidade", variant: "destructive" });
    } else {
      toast({ title: `Penalidade ${!isPenalized ? "aplicada" : "removida"} com sucesso!` });
      loadAppointments(); // Recarrega os dados para atualizar a UI
    }
  };

  // --- HANDLERS DE DRAG AND DROP ---

  // Chamado quando o arrasto começa
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string); // Define o ID do item sendo arrastado
  };

  // Chamado quando o arrasto termina
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); // Limpa o ID ativo

    if (over && active.id !== over.id) {
      const newDate = over.id as string; // O ID do droppable é a nova data (yyyy-MM-dd)
      const appointmentId = active.id as string;

      // Atualiza a data do agendamento no banco de dados
      const { error } = await supabase
        .from("appointments")
        .update({ date: newDate, updated_at: new Date().toISOString() })
        .eq("id", appointmentId);

      if (error) {
        toast({ title: "Erro ao reagendar", variant: "destructive" });
      } else {
        toast({ title: "Agendamento reagendado com sucesso!" });
        loadAppointments(); // Recarrega os dados para refletir a mudança
      }
    }
  };

  // --- FUNÇÕES DE AGRUPAMENTO DE AGENDAMENTOS ---

  // Agrupa agendamentos por dia (formato yyyy-MM-dd)
  const getAppointmentsForDay = (day: Date) => {
    const dayString = format(day, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.date === dayString).sort((a, b) => (a.time > b.time ? 1 : -1)); // Ordena por horário
  };

  // --- FUNÇÕES DE RENDERIZAÇÃO DE VISUALIZAÇÕES ---

  // Renderiza a visualização mensal
  const renderMonthView = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de semanas e dias */}
      {getMonthWeeks().map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-5 gap-2 md:gap-4">
          {week.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isDayHoliday = isHoliday(day);
            const holidayName = isDayHoliday ? getHolidayName(day) : null;

            return (
              // Área de destino (DroppableDay) para o DND
              <DroppableDay
                key={day.toISOString()}
                id={format(day, "yyyy-MM-dd")} // ID do droppable é a data
                className={`min-h-[120px] p-2 border rounded-lg transition-colors ${
                  isDayHoliday ? "bg-red-50/50 border-red-200" : "bg-card hover:bg-muted/50"
                }`}
              >
                {/* Indicador de dia e feriado */}
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

                {/* Lista de agendamentos do dia */}
                <div className="space-y-1">
                  {dayAppointments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">Sem agendamentos</p>
                  ) : (
                    dayAppointments.map((apt) => (
                      // Card de agendamento arrastável (DraggableAppointmentCard)
                      <DraggableAppointmentCard
                        key={apt.id}
                        id={apt.id}
                        className="p-1 text-xs cursor-grab"
                        // Cor de fundo baseada na cor do primeiro agente
                        backgroundColor={
                          apt.agents && apt.agents.length > 0 && apt.agents[0].color
                            ? `${apt.agents[0].color}15`
                            : "hsl(var(--primary) / 0.1)"
                        }
                        // Cor da borda baseada na cor do primeiro agente
                        borderColor={
                          apt.agents && apt.agents.length > 0 && apt.agents[0].color
                            ? apt.agents[0].color
                            : "hsl(var(--primary) / 0.2)"
                        }
                      >
                        {/* Botões de ação (Edição/Exclusão) */}
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit("calendar") && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 bg-background/80 hover:bg-background"
                                onClick={() => handleEditAppointment(apt.id)}
                              >
                                <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDeleteAppointment(apt.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        {/* Conteúdo resumido do agendamento */}
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

  // Renderiza a visualização semanal
  const renderWeekView = () => (
    <div className="space-y-4 md:space-y-6">
      {getCurrentWeekDays().map((day) => {
        const dayAppointments = getAppointmentsForDay(day);
        const isDayHoliday = isHoliday(day);
        const holidayName = isDayHoliday ? getHolidayName(day) : null;

        return (
          <div key={day.toISOString()} className="flex flex-col md:flex-row bg-card rounded-lg border p-2 md:p-4">
            {/* Cabeçalho do dia (Dia da semana e data) */}
            <div className="flex-shrink-0 w-full md:w-40 mb-2 md:mb-0 md:mr-4 text-center md:text-left">
              <div className="text-xs md:text-sm text-muted-foreground">{format(day, "EEEE", { locale: ptBR })}</div>
              <div className="text-base md:text-lg font-semibold">{format(day, "dd/MM", { locale: ptBR })}</div>
              {/* Badge de feriado */}
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

            {/* Área de destino (DroppableDay) para os cards de agendamento */}
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
                  // Card de agendamento arrastável (DraggableAppointmentCard)
                  <DraggableAppointmentCard
                    key={apt.id}
                    id={apt.id}
                    className="flex-shrink-0 w-64"
                    // Cor de fundo baseada na cor do primeiro agente
                    backgroundColor={
                      apt.agents && apt.agents.length > 0 && apt.agents[0].color
                        ? `${apt.agents[0].color}15`
                        : "hsl(var(--primary) / 0.1)"
                    }
                    // Cor da borda baseada na cor do primeiro agente
                    borderColor={
                      apt.agents && apt.agents.length > 0 && apt.agents[0].color
                        ? apt.agents[0].color
                        : "hsl(var(--primary) / 0.2)"
                    }
                  >
                    {/* Botões de ação (Edição/Exclusão) */}
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
                    {/* Conteúdo detalhado do agendamento */}
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

  // --- RENDERIZAÇÃO PRINCIPAL ---

  return (
    // Contexto DND para habilitar o arrasto e soltura
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // Estratégia de colisão
      onDragStart={handleDragStart} // Início do arrasto
      onDragEnd={handleDragEnd} // Fim do arrasto
    >
      <div className="space-y-4 md:space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendário</h1>
            <p className="text-sm md:text-base text-muted-foreground">Visualize todos os agendamentos</p>
          </div>
          {/* Botão Novo Agendamento (visível apenas para quem pode editar) */}
          {canEdit("calendar") && (
            <Button onClick={() => navigate("/new-appointment")} size="sm" className="w-full sm:w-auto">
              Novo Agendamento
            </Button>
          )}
        </div>

        {/* Barra de Navegação e Seleção de Visualização */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-card rounded-lg border p-3 md:p-4 gap-3">
          {/* Seletor de Modo de Visualização (Toggle Group) */}
          <div className="flex items-center rounded-md border p-1">
            {/* Botão Semana */}
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")}>
              Semana
            </Button>
            {/* Botão Mês */}
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")}>
              Mês
            </Button>
          </div>

          {/* Indicador de Período Atual */}
          <div className="text-center flex-1">
            <p className="text-xs md:text-sm text-muted-foreground">{viewMode === "month" ? "Mês de" : "Semana de"}</p>
            <p className="font-semibold text-base md:text-lg">
              {viewMode === "month"
                ? format(currentMonth, "MMMM yyyy", { locale: ptBR }) // Formato para Mês
                : `de ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })} a ${format(endOfWeek(currentMonth, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })}`}{" "}
              {/* Formato para Semana */}
            </p>
          </div>

          {/* Botões de Navegação de Data */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Mês/Semana Anterior */}
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
            {/* Botão Hoje */}
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
            {/* Mês/Semana Próxima */}
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

        {/* Renderiza a visualização de Mês ou Semana com base no estado */}
        {viewMode === "month" ? renderMonthView() : renderWeekView()}

        {/* Overlay para o item sendo arrastado (DND) */}
        <DragOverlay>
          {activeId ? (
            <DraggableAppointmentCard id={activeId} isOverlay>
              {/* Renderiza o conteúdo do agendamento arrastado */}
              {renderAppointmentCardContent(appointments.find((apt) => apt.id === activeId)!, viewMode === "month")}
            </DraggableAppointmentCard>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

// --- FUNÇÕES AUXILIARES (fora do componente, se necessário, mas mantidas aqui para contexto) ---

// Funções handleEditAppointment e handleDeleteAppointment (não definidas no código, mas referenciadas)
const handleEditAppointment = (id: string) => {
  console.log(`Editar agendamento: ${id}`);
  // Lógica de navegação para a página de edição
};

const handleDeleteAppointment = (id: string) => {
  console.log(`Excluir agendamento: ${id}`);
  // Lógica de exclusão
};
