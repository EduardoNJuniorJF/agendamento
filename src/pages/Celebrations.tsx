import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isHoliday, getHolidayName, LocalHolidayData } from "@/lib/holidays";
import { Badge } from "@/components/ui/badge";
import {
  Cake,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ExternalLink,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LocalHoliday {
  id: string;
  name: string;
  day: number;
  month: number;
  year: number | null;
  location: string;
}

interface Birthday {
  id: string;
  employee_name: string;
  birth_date: string;
  image_url: string | null;
}

interface SeasonalDate {
  id: string;
  name: string;
  day: number;
  month: number;
  image_url: string | null;
  location: string;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function Celebrations() {
  const { role, user } = useAuth();
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      // DEV always can manage
      if (role === 'dev') {
        setCanManage(true);
        return;
      }
      
      // Check if admin from Comercial or Administrativo sector
      if (role === 'admin') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sector')
          .eq('id', user.id)
          .single();
        
        if (profile?.sector && ['Comercial', 'Administrativo'].includes(profile.sector)) {
          setCanManage(true);
          return;
        }
      }
      
      setCanManage(false);
    };
    
    checkPermissions();
  }, [user, role]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Celebrações e Datas Sazonais</h1>

      <Tabs defaultValue="birthdays" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="birthdays" className="flex items-center gap-2">
            <Cake className="h-4 w-4" />
            Aniversários
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Datas Sazonais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="birthdays">
          <BirthdaysSection canManage={canManage} />
        </TabsContent>

        <TabsContent value="seasonal">
          <SeasonalDatesSection canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== BIRTHDAYS SECTION ====================
function BirthdaysSection({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [formData, setFormData] = useState({ employee_name: "", birth_date: "", image_url: "" });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedBirthdayImage, setSelectedBirthdayImage] = useState<{ url: string; name: string } | null>(null);

  const { data: birthdays = [], isLoading } = useQuery({
    queryKey: ["birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("birthdays").select("*").order("birth_date");
      if (error) throw error;
      return data as Birthday[];
    },
  });

  // Filter birthdays by selected month
  const filteredBirthdays = birthdays.filter((birthday) => {
    const birthMonth = new Date(birthday.birth_date + "T12:00:00").getMonth() + 1;
    return birthMonth === selectedMonth;
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Birthday, "id">) => {
      const { error } = await supabase.from("birthdays").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthdays"] });
      toast.success("Aniversário cadastrado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar aniversário"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Birthday) => {
      const { error } = await supabase.from("birthdays").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthdays"] });
      toast.success("Aniversário atualizado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar aniversário"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("birthdays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthdays"] });
      toast.success("Aniversário excluído com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir aniversário"),
  });

  const resetForm = () => {
    setFormData({ employee_name: "", birth_date: "", image_url: "" });
    setEditingBirthday(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (birthday: Birthday) => {
    setEditingBirthday(birthday);
    setFormData({
      employee_name: birthday.employee_name,
      birth_date: birthday.birth_date,
      image_url: birthday.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.employee_name || !formData.birth_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingBirthday) {
      updateMutation.mutate({
        id: editingBirthday.id,
        employee_name: formData.employee_name,
        birth_date: formData.birth_date,
        image_url: formData.image_url || null,
      });
    } else {
      createMutation.mutate({
        employee_name: formData.employee_name,
        birth_date: formData.birth_date,
        image_url: formData.image_url || null,
      });
    }
  };

  const handleDownloadImage = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/\s+/g, "_")}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          Aniversários dos Funcionários
        </CardTitle>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedMonth((m) => (m === 1 ? 12 : m - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[100px] text-center">{MONTHS[selectedMonth - 1]}</span>
            <Button variant="outline" size="icon" onClick={() => setSelectedMonth((m) => (m === 12 ? 1 : m + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Aniversário
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBirthday ? "Editar Aniversário" : "Novo Aniversário"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee_name">Nome do Funcionário *</Label>
                  <Input
                    id="employee_name"
                    value={formData.employee_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, employee_name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Aniversário *</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">URL da Imagem (opcional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {formData.image_url && (
                    <div className="mt-2 relative inline-block">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          toast.error("URL da imagem inválida");
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>{editingBirthday ? "Atualizar" : "Cadastrar"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredBirthdays.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum aniversário em {MONTHS[selectedMonth - 1]}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBirthdays.map((birthday) => {
                const birthDate = new Date(birthday.birth_date + "T12:00:00");
                const today = new Date();
                const isBirthdayToday =
                  birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();

                return (
                  <TableRow
                    key={birthday.id}
                    className={cn(isBirthdayToday && "bg-primary/20 border-l-4 border-l-primary")}
                  >
                    <TableCell>
                      {birthday.image_url ? (
                        <img
                          src={birthday.image_url}
                          alt={birthday.employee_name}
                          className="h-10 w-10 object-cover rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() =>
                            setSelectedBirthdayImage({ url: birthday.image_url!, name: birthday.employee_name })
                          }
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            isBirthdayToday ? "bg-primary text-primary-foreground" : "bg-muted",
                          )}
                        >
                          <Cake className={cn("h-5 w-5", !isBirthdayToday && "text-muted-foreground")} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={cn("font-medium", isBirthdayToday && "text-primary font-bold")}>
                      {birthday.employee_name}
                      {isBirthdayToday && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          🎉 Hoje!
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{format(birthDate, "dd 'de' MMMM", { locale: ptBR })}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(birthday)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(birthday.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Birthday Image Preview Dialog */}
      <Dialog open={!!selectedBirthdayImage} onOpenChange={() => setSelectedBirthdayImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedBirthdayImage?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedBirthdayImage && (
            <div className="space-y-4">
              <img
                src={selectedBirthdayImage.url}
                alt={selectedBirthdayImage.name}
                className="w-full h-auto rounded-md"
              />
              <div className="flex justify-end gap-2">
                {/*   <Button
                  variant="outline"
                  onClick={() => window.open(selectedBirthdayImage.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir em nova aba
                </Button>*/}
                <Button onClick={() => handleDownloadImage(selectedBirthdayImage.url, selectedBirthdayImage.name)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Imagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ==================== SEASONAL DATES SECTION ====================
function SeasonalDatesSection({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SeasonalDate | null>(null);
  const [formData, setFormData] = useState({ name: "", day: 1, month: 1, image_url: "", location: "brasil" });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  
  // Local holidays state
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<LocalHoliday | null>(null);
  const [holidayFormData, setHolidayFormData] = useState({ 
    name: "", 
    day: 1, 
    month: 1, 
    year: null as number | null, 
    location: "tres_rios" 
  });

  const { data: seasonalDates = [], isLoading } = useQuery({
    queryKey: ["seasonal_dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seasonal_dates").select("*").order("month").order("day");
      if (error) throw error;
      return data as SeasonalDate[];
    },
  });

  // Fetch local holidays
  const { data: localHolidays = [], isLoading: isLoadingHolidays } = useQuery({
    queryKey: ["local_holidays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("local_holidays").select("*").order("month").order("day");
      if (error) throw error;
      return data as LocalHoliday[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<SeasonalDate, "id">) => {
      const { error } = await supabase.from("seasonal_dates").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonal_dates"] });
      toast.success("Data sazonal cadastrada com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar data sazonal"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: SeasonalDate) => {
      const { error } = await supabase.from("seasonal_dates").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonal_dates"] });
      toast.success("Data sazonal atualizada com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar data sazonal"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seasonal_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonal_dates"] });
      toast.success("Data sazonal excluída com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir data sazonal"),
  });

  // Local holiday mutations
  const createHolidayMutation = useMutation({
    mutationFn: async (data: Omit<LocalHoliday, "id">) => {
      const { error } = await supabase.from("local_holidays").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local_holidays"] });
      toast.success("Feriado cadastrado com sucesso!");
      resetHolidayForm();
    },
    onError: () => toast.error("Erro ao cadastrar feriado"),
  });

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, ...data }: LocalHoliday) => {
      const { error } = await supabase.from("local_holidays").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local_holidays"] });
      toast.success("Feriado atualizado com sucesso!");
      resetHolidayForm();
    },
    onError: () => toast.error("Erro ao atualizar feriado"),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("local_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local_holidays"] });
      toast.success("Feriado excluído com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir feriado"),
  });

  const resetForm = () => {
    setFormData({ name: "", day: 1, month: 1, image_url: "", location: "brasil" });
    setEditingDate(null);
    setIsDialogOpen(false);
  };

  const resetHolidayForm = () => {
    setHolidayFormData({ name: "", day: 1, month: 1, year: null, location: "tres_rios" });
    setEditingHoliday(null);
    setIsHolidayDialogOpen(false);
  };

  const handleEditHoliday = (holiday: LocalHoliday) => {
    setEditingHoliday(holiday);
    setHolidayFormData({
      name: holiday.name,
      day: holiday.day,
      month: holiday.month,
      year: holiday.year,
      location: holiday.location,
    });
    setIsHolidayDialogOpen(true);
  };

  const handleSubmitHoliday = () => {
    if (!holidayFormData.name) {
      toast.error("Preencha o nome do feriado");
      return;
    }

    if (editingHoliday) {
      updateHolidayMutation.mutate({
        id: editingHoliday.id,
        name: holidayFormData.name,
        day: holidayFormData.day,
        month: holidayFormData.month,
        year: holidayFormData.year,
        location: holidayFormData.location,
      });
    } else {
      createHolidayMutation.mutate({
        name: holidayFormData.name,
        day: holidayFormData.day,
        month: holidayFormData.month,
        year: holidayFormData.year,
        location: holidayFormData.location,
      });
    }
  };

  const handleEdit = (date: SeasonalDate) => {
    setEditingDate(date);
    setFormData({
      name: date.name,
      day: date.day,
      month: date.month,
      image_url: date.image_url || "",
      location: date.location,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Preencha o nome da data sazonal");
      return;
    }

    if (editingDate) {
      updateMutation.mutate({
        id: editingDate.id,
        name: formData.name,
        day: formData.day,
        month: formData.month,
        image_url: formData.image_url || null,
        location: formData.location,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        day: formData.day,
        month: formData.month,
        image_url: formData.image_url || null,
        location: formData.location,
      });
    }
  };

  const handleDownloadImage = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/\s+/g, "_")}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calendar rendering
  const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth));
  const firstDayOfMonth = getDay(startOfMonth(new Date(currentYear, currentMonth)));

  const datesInCurrentMonth = seasonalDates.filter((d) => d.month === currentMonth + 1);

  const getDateForDay = (day: number) => {
    return datesInCurrentMonth.filter((d) => d.day === day);
  };

  return (
    <div className="space-y-6">
      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendário de Datas Sazonais
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {canManage && (
                <>
                  <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetHolidayForm();
                          setIsHolidayDialogOpen(true);
                        }}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Novo Feriado
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingHoliday ? "Editar Feriado" : "Novo Feriado Local"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="holiday_name">Nome do Feriado *</Label>
                          <Input
                            id="holiday_name"
                            value={holidayFormData.name}
                            onChange={(e) => setHolidayFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Aniversário da Cidade..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Dia</Label>
                            <Select
                              value={holidayFormData.day.toString()}
                              onValueChange={(v) => setHolidayFormData((prev) => ({ ...prev, day: parseInt(v) }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Mês</Label>
                            <Select
                              value={holidayFormData.month.toString()}
                              onValueChange={(v) => setHolidayFormData((prev) => ({ ...prev, month: parseInt(v) }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MONTHS.map((month, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Ano (deixe vazio para feriado recorrente)</Label>
                          <Input
                            type="number"
                            value={holidayFormData.year ?? ""}
                            onChange={(e) => setHolidayFormData((prev) => ({ 
                              ...prev, 
                              year: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                            placeholder="Ex: 2025 (opcional)"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={resetHolidayForm}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSubmitHoliday}>{editingHoliday ? "Atualizar" : "Cadastrar"}</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          resetForm();
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Data
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingDate ? "Editar Data Sazonal" : "Nova Data Sazonal"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome da Data *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Natal, Carnaval..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Dia</Label>
                          <Select
                            value={formData.day.toString()}
                            onValueChange={(v) => setFormData((prev) => ({ ...prev, day: parseInt(v) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Mês</Label>
                          <Select
                            value={formData.month.toString()}
                            onValueChange={(v) => setFormData((prev) => ({ ...prev, month: parseInt(v) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Localização</Label>
                        <Select
                          value={formData.location}
                          onValueChange={(v) => setFormData((prev) => ({ ...prev, location: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brasil">Brasil</SelectItem>
                            <SelectItem value="tres_rios">Três Rios</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="seasonal_image_url">URL da Imagem (opcional)</Label>
                        <Input
                          id="seasonal_image_url"
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://exemplo.com/imagem.jpg"
                        />
                        {formData.image_url && (
                          <div className="mt-2 relative inline-block">
                            <img
                              src={formData.image_url}
                              alt="Preview"
                              className="h-20 w-20 object-cover rounded-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "";
                                toast.error("URL da imagem inválida");
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetForm}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSubmit}>{editingDate ? "Atualizar" : "Cadastrar"}</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear((y) => y - 1);
                    } else {
                      setCurrentMonth((m) => m - 1);
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[150px] text-center">
                  {MONTHS[currentMonth]} {currentYear}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear((y) => y + 1);
                    } else {
                      setCurrentMonth((m) => m + 1);
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Weekday headers */}
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="text-center text-base font-semibold text-muted-foreground py-3">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} className="h-16" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const datesForDay = getDateForDay(day);
                const hasDate = datesForDay.length > 0;
                const today = new Date();
                const isToday =
                  day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                
                // Check for holidays (fixed + local)
                const dateToCheck = new Date(currentYear, currentMonth, day);
                const isDayHoliday = isHoliday(dateToCheck, localHolidays as LocalHolidayData[]);
                const holidayName = isDayHoliday ? getHolidayName(dateToCheck, localHolidays as LocalHolidayData[]) : null;

                return (
                  <div
                    key={day}
                    className={cn(
                      "h-20 border rounded-lg flex flex-col items-center justify-start p-1 relative group",
                      isToday && "ring-2 ring-offset-2 ring-destructive",
                      isDayHoliday && !hasDate
                        ? "bg-red-50/50 border-red-200"
                        : hasDate
                          ? "bg-primary/10 border-primary cursor-pointer hover:bg-primary/20 transition-colors"
                          : isToday
                            ? "bg-destructive/10 border-destructive"
                            : "border-border",
                    )}
                    onClick={() => {
                      if (hasDate && datesForDay[0].image_url) {
                        setSelectedImage({ url: datesForDay[0].image_url, name: datesForDay[0].name });
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isToday && !hasDate && !isDayHoliday && "text-destructive",
                        isDayHoliday && "text-red-600",
                        hasDate ? "text-primary" : "text-foreground",
                      )}
                    >
                      {day}
                    </span>
                    
                    {/* Show holiday badge */}
                    {isDayHoliday && holidayName && (
                      <Badge variant="destructive" className="text-[7px] px-1 py-0 mt-0.5 max-w-full truncate">
                        {holidayName}
                      </Badge>
                    )}
                    
                    {/* Show seasonal date */}
                    {hasDate && (
                      <>
                        <span className="text-[9px] font-medium text-primary text-center px-0.5 truncate w-full mt-0.5">
                          {datesForDay[0].name}
                        </span>
                        {/* Edit/Delete buttons - shown on hover */}
                        {canManage && (
                          <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 bg-background/80 hover:bg-background"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(datesForDay[0]);
                              }}
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(datesForDay[0].id);
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Holidays List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feriados Locais Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHolidays ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : localHolidays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum feriado local cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ano</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {localHolidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      {holiday.day.toString().padStart(2, '0')}/{MONTHS[holiday.month - 1]}
                    </TableCell>
                    <TableCell>
                      {holiday.year ? holiday.year : <span className="text-muted-foreground">Todo ano</span>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditHoliday(holiday)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-auto rounded-md" />
              <div className="flex justify-end gap-2">
                {/*<Button variant="outline" onClick={() => window.open(selectedImage.url, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir em nova aba
                </Button>*/}
                <Button onClick={() => handleDownloadImage(selectedImage.url, selectedImage.name)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Imagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
