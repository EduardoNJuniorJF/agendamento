import React, { useEffect, useState, useContext, createContext, useCallback } from "react";
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
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Edit, Trash2, PartyPopper, GripVertical, Loader2 } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- SIMULAÇÃO DE DEPENDÊNCIAS ---

// 1. Simulação do Supabase Client
const supabase = {
  from: (table) => ({
    select: (query) => ({
      // Simulação para carregar appointments (retornará um array vazio ou mock)
      gte: () => ({ lte: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
    delete: () => Promise.resolve({ error: null, status: 204 }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
};

// 2. Simulação do useToast (shadcn/ui-like)
const useToast = () => {
  const toast = useCallback(({ title, description, variant }) => {
    console.log(`[TOAST] ${variant || "default"}: ${title} - ${description || ""}`);
  }, []);
  return { toast };
};

// 3. Simulação do useAuth
const AuthContext = createContext({
  canEdit: (area) => true, // Permite edição por padrão para testes
});
const useAuth = () => useContext(AuthContext);

// 4. Simulação de Navegação
const useNavigate = () => {
  const navigate = useCallback((path) => {
    console.log(`[NAVIGATE] Navegando para: ${path}`);
  }, []);
  return navigate;
};

// 5. Simulação de Feriados (Apenas um mock para o dia 25/12)
const isHoliday = (date) => isSameDay(date, new Date(date.getFullYear(), 11, 25));
const getHolidayName = (date) => (isHoliday(date) ? "Natal" : null);

// 6. Simulação de Componentes UI (shadcn/ui)
const Button = ({ children, onClick, variant = "default", size = "default", className = "" }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md transition-colors ${className}`}
    style={{
      backgroundColor: variant === "outline" ? "#f3f4f6" : variant === "destructive" ? "#ef4444" : "#000",
      color: variant === "destructive" ? "#fff" : "#fff",
      border: variant === "outline" ? "1px solid #e5e7eb" : "none",
    }}
  >
    {children}
  </button>
);
const Badge = ({ children, variant = "default", className = "" }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    style={{
      backgroundColor: variant === "destructive" ? "#fecaca" : "#f3f4f6",
      color: variant === "destructive" ? "#dc2626" : "#4b5563",
    }}
  >
    {children}
  </span>
);

// 7. Componente DroppableDay (Container para Agendamentos)
const DroppableDay = ({ id, children, className }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const style = {
    backgroundColor: isOver ? "hsl(210 40% 96% / 0.5)" : undefined, // bg-muted/50 on hover
    minHeight: "150px",
  };
  return (
    <div ref={setNodeRef} style={style} className={`${className} transition-colors`}>
      {children}
    </div>
  );
};

// 8. Componente DraggableAppointmentCard
const DraggableAppointmentCard = React.forwardRef(({ id, children, backgroundColor, borderColor, ...props }, ref) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    backgroundColor: backgroundColor || "rgba(0, 150, 136, 0.1)",
    border: `1px solid ${borderColor || "rgba(0, 150, 136, 0.2)"}`,
    position: "relative",
    borderRadius: "0.5rem", // rounded-lg
    padding: "1rem",
  };

  // Merge external ref with dnd-kit's setNodeRef
  const combinedRef = useCallback(
    (node) => {
      setNodeRef(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [setNodeRef, ref],
  );

  return (
    <div
      ref={combinedRef}
      style={style}
      {...attributes}
      {...listeners}
      {...props}
      className="group shadow-sm hover:shadow-md transition-shadow relative"
    >
      {/* Drag handle visual */}
      <GripVertical className="h-4 w-4 absolute top-1 left-1 text-gray-500 opacity-50 group-hover:opacity-100 transition-opacity cursor-grab" />
      <div style={{ marginLeft: "16px" }}>{children}</div>
    </div>
  );
});

// --- FIM DA SIMULAÇÃO DE DEPENDÊNCIAS ---

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

  // MOCK DATA PARA DEMONSTRAÇÃO (Será substituído pelos dados do Supabase)
  const mockAppointments = [
    {
      id: "1",
      title: "Ticket #4567",
      city: "São Paulo",
      date: format(currentMonth, "yyyy-MM-") + "10",
      time: "14:00",
      status: "pending",
      expense_status: "separar_dinheiro",
      agents: [{ name: "Agent A", color: "#3b82f6" }],
      vehicles: { model: "Carro X", plate: "ABC-123" },
      description: "Instalação de novo servidor na sede.",
    },
    {
      id: "2",
      title: "Reunião Cliente Y",
      city: "Rio de Janeiro",
      date: format(currentMonth, "yyyy-MM-") + "10",
      time: "09:30",
      status: "confirmed",
      expense_status: "nao_separar",
      agents: [{ name: "Agent B", color: "#10b981" }],
      vehicles: { model: "Van Z", plate: "DEF-456" },
    },
    {
      id: "3",
      title: "Manutenção Rotina",
      city: "Curitiba",
      date: format(currentMonth, "yyyy-MM-") + "12",
      time: "16:00",
      status: "confirmed",
      expense_status: "separar_dia_anterior",
      agents: [
        { name: "Agent A", color: "#3b82f6" },
        { name: "Agent C", color: "#f59e0b" },
      ],
      vehicles: { model: "Carro X", plate: "ABC-123" },
      description: "Verificar status dos backups e licenças.",
    },
  ];
  // Adiciona um mock de Natal se for Dezembro
  if (currentMonth.getMonth() === 11) {
    mockAppointments.push({
      id: "holiday_apt",
      title: "Feriado de Natal",
      city: "Casa",
      date: format(currentMonth, "yyyy-") + "12-25",
      time: "00:00",
      status: "holiday",
      expense_status: "nao_separar",
      agents: [],
      vehicles: undefined,
    });
  }

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      // --- Início da lógica simulada do Supabase ---
      console.log(`[DB] Tentando carregar agendamentos de ${monthStartStr} a ${monthEndStr}`);

      // Simulação: Filtra os mocks para o mês atual
      const data = mockAppointments.filter((apt) => {
        const aptDate = parseISO(apt.date);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });

      // Simulação: A Promise.all abaixo é complexa, vou pular a simulação dela
      // e usar diretamente os dados mockados que já contêm 'agents' e 'vehicles'.

      setAppointments(data);
      // --- Fim da lógica simulada do Supabase ---
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      // Simulação de delay para loading
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [currentMonth]);

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks
      .map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

        // Filtra para manter apenas dias úteis que pertencem ao mês atual
        const daysInMonth = days.filter((day) => {
          const dayOfWeek = day.getDay();
          const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6; // Segunda (1) a Sexta (5)
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          return isWeekday && isCurrentMonth;
        });

        return daysInMonth;
      })
      .filter((week) => week.length > 0);
  };

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.date === dayStr);
  };

  const getExpenseLabel = (status: string) => {
    switch (status) {
      case "nao_separar":
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
    // Uso de window.confirm para manter a funcionalidade original (Substituir por Modal customizado!)
    if (!window.confirm(`Tem certeza que deseja excluir o agendamento ID: ${id}?`)) return;

    try {
      console.log(`[DB] Tentativa de DELETE na tabela 'appointments' para o ID: ${id}`);

      // Simulação da chamada ao Supabase
      const { error, status } = await supabase.from("appointments").delete().eq("id", id);

      if (error) {
        // Se houver erro, loga e exibe a mensagem de erro detalhada
        console.error("ERRO AO EXCLUIR AGENDAMENTO:", error.message, "ID:", id);
        toast({
          title: "Falha na exclusão!",
          description: `Erro: ${error.message}. Verifique o console ou as políticas RLS.`,
          variant: "destructive",
        });
        return;
      }

      // 2. Se o backend confirmou a operação
      toast({ title: "Agendamento excluído com sucesso!" });

      // 3. Força o recarregamento dos dados para refletir a mudança
      // Na simulação, vamos remover o item localmente. No código real, loadAppointments() faria isso.
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));
      // loadAppointments();
    } catch (error) {
      console.error("Erro de rede ou inesperado:", error);
      toast({ title: "Erro de rede ou inesperado.", variant: "destructive" });
    }
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
      console.log(`[DB] Tentativa de UPDATE de data para o ID: ${appointmentId} -> Nova Data: ${newDate}`);

      // Simulação da chamada ao Supabase
      const { error } = await supabase.from("appointments").update({ date: newDate }).eq("id", appointmentId);

      if (error) throw error;

      toast({ title: "Agendamento movido com sucesso!" });

      // Atualiza o estado localmente na simulação
      setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? { ...apt, date: newDate } : apt)));

      // loadAppointments(); // Linha original para recarregar do DB
    } catch (error) {
      console.error("Error moving appointment:", error);
      toast({
        title: "Erro ao mover agendamento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando calendário...
      </div>
    );
  }

  const monthWeeks = getMonthWeeks();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
      <style>{`
        .bg-card { background-color: white; }
        .rounded-lg { border-radius: 0.5rem; }
        .border { border: 1px solid #e5e7eb; }
        .text-muted-foreground { color: #6b7280; }
        .bg-muted\\/50 { background-color: rgba(243, 244, 246, 0.5); }
        .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        .hover\\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); }
        .transition-shadow { transition: box-shadow 150ms ease-in-out; }
        .transition-colors { transition: background-color 150ms ease-in-out; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .grid { display: grid; }
        .gap-4 { gap: 1rem; }
        .gap-x-3 { column-gap: 0.75rem; }
        .gap-y-2 { row-gap: 0.5rem; }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .col-span-2 { grid-column: span 2 / span 2; }
        .col-span-3 { grid-column: span 3 / span 3; }
        .h-6 { height: 1.5rem; } .w-6 { width: 1.5rem; }
        .h-4 { height: 1rem; } .w-4 { width: 1rem; }
        .h-3 { height: 0.75rem; } .w-3 { width: 0.75rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-0\\.5 { margin-top: 0.125rem; }
        .opacity-0 { opacity: 0; }
        .group:hover .group-hover\\:opacity-100 { opacity: 1; }
      `}</style>
      <AuthContext.Provider value={{ canEdit }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendário</h1>
                <p className="text-muted-foreground">Visualize todos os agendamentos (Dias úteis)</p>
              </div>
              {canEdit("calendar") && (
                <Button
                  onClick={() => navigate("/new-appointment")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Novo Agendamento
                </Button>
              )}
            </div>

            {/* HEADER DE NAVEGAÇÃO */}
            <div className="flex items-center justify-between bg-card rounded-lg border p-4 shadow-sm">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Mês de</p>
                <p className="font-semibold text-xl text-gray-800">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 h-10 w-10 p-0"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 h-10 w-10 p-0"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* CALENDÁRIO SEMANA A SEMANA */}
            <div className="space-y-6">
              {monthWeeks.map((weekDays, weekIndex) => {
                if (weekDays.length === 0) return null;
                return (
                  <div key={weekIndex} className="space-y-3">
                    <div className="bg-muted/50 rounded-lg px-4 py-2 border">
                      <h3 className="font-semibold text-sm text-gray-700">
                        Semana {weekIndex + 1} - de {format(weekDays[0], "dd/MM", { locale: ptBR })} a{" "}
                        {format(weekDays[weekDays.length - 1], "dd/MM", { locale: ptBR })}
                      </h3>
                    </div>
                    {/* Linha de Dias da Semana (Droppable Zones) */}
                    <div
                      className="grid gap-4 w-full"
                      style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
                    >
                      {weekDays.map((day) => {
                        const dayAppointments = getAppointmentsForDay(day);
                        const isDayHoliday = isHoliday(day);
                        const holidayName = isDayHoliday ? getHolidayName(day) : null;
                        const dayKey = format(day, "yyyy-MM-dd");

                        return (
                          <DroppableDay key={dayKey} id={dayKey} className="bg-card rounded-lg border p-4 shadow-sm">
                            <div className="mb-4 text-center">
                              <div className="text-sm text-muted-foreground">
                                {format(day, "EEEE", { locale: ptBR })}
                              </div>
                              <div className="text-2xl font-bold text-gray-900">
                                {format(day, "dd")}
                                <span className="text-lg text-muted-foreground font-semibold ml-1">
                                  /{format(day, "MM")}
                                </span>
                              </div>
                              {isDayHoliday && holidayName && (
                                <Badge
                                  variant="destructive"
                                  className="mt-2 text-[10px] px-2 py-0.5 flex items-center gap-1 justify-center bg-red-100 border-red-400 text-red-700"
                                >
                                  <PartyPopper className="h-3 w-3" />
                                  {holidayName}
                                </Badge>
                              )}
                            </div>

                            {/* Lista de Agendamentos (Draggables) */}
                            <div className="space-y-3 pt-2">
                              {dayAppointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Sem agendamentos</p>
                              ) : (
                                dayAppointments.map((apt) => (
                                  <DraggableAppointmentCard
                                    key={apt.id}
                                    id={apt.id}
                                    backgroundColor={
                                      apt.agents && apt.agents.length > 0 && apt.agents[0].color
                                        ? `${apt.agents[0].color}15`
                                        : "rgba(59, 130, 246, 0.1)"
                                    }
                                    borderColor={
                                      apt.agents && apt.agents.length > 0 && apt.agents[0].color
                                        ? apt.agents[0].color
                                        : "rgba(59, 130, 246, 0.2)"
                                    }
                                  >
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                      {canEdit("calendar") && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 bg-white/80 hover:bg-white border border-gray-200 text-gray-700 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditAppointment(apt.id);
                                            }}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 bg-white/80 hover:bg-red-500 hover:text-white border border-gray-200 text-gray-700 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAppointment(apt.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-gray-700">
                                      {/* Informações da Linha 1 */}
                                      <div>
                                        <div className="font-medium text-[10px] text-gray-500">Cliente / Ticket:</div>
                                        <div className="font-semibold text-sm truncate">{apt.title}</div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-[10px] text-gray-500">Cidade:</div>
                                        <div className="text-sm text-muted-foreground truncate">{apt.city}</div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-[10px] text-gray-500">Horário:</div>
                                        <div className="text-sm text-muted-foreground">{apt.time}</div>
                                      </div>
                                      {/* Informações da Linha 2 */}
                                      <div className="col-span-3">
                                        <div className="font-medium text-[10px] text-gray-500">Agente:</div>
                                        <div className="text-sm text-muted-foreground space-y-0.5 flex flex-wrap gap-x-2">
                                          {apt.agents && apt.agents.length > 0 ? (
                                            apt.agents.map((agent, idx) => (
                                              <div
                                                key={idx}
                                                className="truncate font-medium"
                                                style={{ color: agent.color || "#3b82f6" }}
                                              >
                                                {agent.name}
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-gray-500">Não atribuído</span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Informações da Linha 3 */}
                                      <div>
                                        <div className="font-medium text-[10px] text-gray-500">Veículo:</div>
                                        <div className="text-sm text-muted-foreground truncate">
                                          {apt.vehicles ? `${apt.vehicles.model}` : "N/A"}
                                        </div>
                                      </div>
                                      <div className="col-span-2">
                                        <div className="font-medium text-[10px] text-gray-500">Despesas:</div>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0.5 mt-0.5 border border-gray-300 text-gray-600"
                                        >
                                          {getExpenseLabel(apt.expense_status)}
                                        </Badge>
                                      </div>
                                      {apt.description && (
                                        <div className="col-span-3">
                                          <div className="font-medium text-[10px] text-gray-500">Observações:</div>
                                          <div className="text-sm text-muted-foreground line-clamp-1">
                                            {apt.description}
                                          </div>
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
                );
              })}
            </div>
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="p-4 bg-blue-500/80 rounded-lg border border-blue-700 shadow-xl opacity-90 transform scale-105 pointer-events-none text-white font-semibold flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                Movendo Agendamento ID: {activeId}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </AuthContext.Provider>
    </div>
  );
}
