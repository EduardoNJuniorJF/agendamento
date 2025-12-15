import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cake, CalendarDays, Plus, Pencil, Trash2, Upload, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Celebrations() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Redirect non-dev users
  if (role !== 'dev') {
    return <Navigate to="/" replace />;
  }

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
          <BirthdaysSection />
        </TabsContent>
        
        <TabsContent value="seasonal">
          <SeasonalDatesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== BIRTHDAYS SECTION ====================
function BirthdaysSection() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [formData, setFormData] = useState({ employee_name: '', birth_date: '', image_url: '' });
  const [uploading, setUploading] = useState(false);

  const { data: birthdays = [], isLoading } = useQuery({
    queryKey: ['birthdays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .order('birth_date');
      if (error) throw error;
      return data as Birthday[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Birthday, 'id'>) => {
      const { error } = await supabase.from('birthdays').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Aniversário cadastrado com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao cadastrar aniversário')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Birthday) => {
      const { error } = await supabase.from('birthdays').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Aniversário atualizado com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar aniversário')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('birthdays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Aniversário excluído com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir aniversário')
  });

  const resetForm = () => {
    setFormData({ employee_name: '', birth_date: '', image_url: '' });
    setEditingBirthday(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (birthday: Birthday) => {
    setEditingBirthday(birthday);
    setFormData({
      employee_name: birthday.employee_name,
      birth_date: birthday.birth_date,
      image_url: birthday.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.employee_name || !formData.birth_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingBirthday) {
      updateMutation.mutate({
        id: editingBirthday.id,
        employee_name: formData.employee_name,
        birth_date: formData.birth_date,
        image_url: formData.image_url || null
      });
    } else {
      createMutation.mutate({
        employee_name: formData.employee_name,
        birth_date: formData.birth_date,
        image_url: formData.image_url || null
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `birthdays/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('celebrations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('celebrations')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          Aniversários dos Funcionários
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aniversário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBirthday ? 'Editar Aniversário' : 'Novo Aniversário'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee_name">Nome do Funcionário *</Label>
                <Input
                  id="employee_name"
                  value={formData.employee_name}
                  onChange={e => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="birth_date">Data de Aniversário *</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Imagem (opcional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                </div>
                {formData.image_url && (
                  <div className="mt-2 relative inline-block">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="h-20 w-20 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={uploading}>
                  {editingBirthday ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum aniversário cadastrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {birthdays.map(birthday => (
                <TableRow key={birthday.id}>
                  <TableCell>
                    {birthday.image_url ? (
                      <img 
                        src={birthday.image_url} 
                        alt={birthday.employee_name}
                        className="h-10 w-10 object-cover rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Cake className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{birthday.employee_name}</TableCell>
                  <TableCell>
                    {format(new Date(birthday.birth_date), "dd 'de' MMMM", { locale: ptBR })}
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== SEASONAL DATES SECTION ====================
function SeasonalDatesSection() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SeasonalDate | null>(null);
  const [formData, setFormData] = useState({ name: '', day: 1, month: 1, image_url: '', location: 'brasil' });
  const [uploading, setUploading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

  const { data: seasonalDates = [], isLoading } = useQuery({
    queryKey: ['seasonal_dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasonal_dates')
        .select('*')
        .order('month')
        .order('day');
      if (error) throw error;
      return data as SeasonalDate[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<SeasonalDate, 'id'>) => {
      const { error } = await supabase.from('seasonal_dates').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal_dates'] });
      toast.success('Data sazonal cadastrada com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao cadastrar data sazonal')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: SeasonalDate) => {
      const { error } = await supabase.from('seasonal_dates').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal_dates'] });
      toast.success('Data sazonal atualizada com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar data sazonal')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seasonal_dates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal_dates'] });
      toast.success('Data sazonal excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir data sazonal')
  });

  const resetForm = () => {
    setFormData({ name: '', day: 1, month: 1, image_url: '', location: 'brasil' });
    setEditingDate(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (date: SeasonalDate) => {
    setEditingDate(date);
    setFormData({
      name: date.name,
      day: date.day,
      month: date.month,
      image_url: date.image_url || '',
      location: date.location
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Preencha o nome da data sazonal');
      return;
    }

    if (editingDate) {
      updateMutation.mutate({
        id: editingDate.id,
        name: formData.name,
        day: formData.day,
        month: formData.month,
        image_url: formData.image_url || null,
        location: formData.location
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        day: formData.day,
        month: formData.month,
        image_url: formData.image_url || null,
        location: formData.location
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `seasonal/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('celebrations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('celebrations')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  // Calendar rendering
  const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth));
  const firstDayOfMonth = getDay(startOfMonth(new Date(currentYear, currentMonth)));
  
  const datesInCurrentMonth = seasonalDates.filter(d => d.month === currentMonth + 1);
  
  const getDateForDay = (day: number) => {
    return datesInCurrentMonth.filter(d => d.day === day);
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Datas Sazonais
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDate ? 'Editar Data Sazonal' : 'Nova Data Sazonal'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Data *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Natal, Carnaval..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dia</Label>
                    <Select
                      value={formData.day.toString()}
                      onValueChange={v => setFormData(prev => ({ ...prev, day: parseInt(v) }))}
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
                      onValueChange={v => setFormData(prev => ({ ...prev, month: parseInt(v) }))}
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
                    onValueChange={v => setFormData(prev => ({ ...prev, location: v }))}
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
                  <Label>Imagem (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                  </div>
                  {formData.image_url && (
                    <div className="mt-2 relative inline-block">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={uploading}>
                    {editingDate ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : seasonalDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma data sazonal cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonalDates.map(date => (
                  <TableRow key={date.id}>
                    <TableCell>
                      {date.image_url ? (
                        <img 
                          src={date.image_url} 
                          alt={date.name}
                          className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage({ url: date.image_url!, name: date.name })}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{date.name}</TableCell>
                    <TableCell>
                      {date.day} de {MONTHS[date.month - 1]}
                    </TableCell>
                    <TableCell>
                      {date.location === 'brasil' ? '🇧🇷 Brasil' : '🏙️ Três Rios'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(date)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(date.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendário de Datas Sazonais</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(y => y - 1);
                  } else {
                    setCurrentMonth(m => m - 1);
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
                    setCurrentYear(y => y + 1);
                  } else {
                    setCurrentMonth(m => m + 1);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const datesForDay = getDateForDay(day);
              const hasDate = datesForDay.length > 0;
              
              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square border rounded-md p-1 flex flex-col items-center justify-start",
                    hasDate && "bg-primary/10 border-primary cursor-pointer hover:bg-primary/20 transition-colors"
                  )}
                  onClick={() => {
                    if (hasDate && datesForDay[0].image_url) {
                      setSelectedImage({ url: datesForDay[0].image_url, name: datesForDay[0].name });
                    }
                  }}
                >
                  <span className={cn(
                    "text-sm",
                    hasDate && "font-bold text-primary"
                  )}>
                    {day}
                  </span>
                  {hasDate && (
                    <div className="text-[10px] text-center text-primary truncate w-full mt-1">
                      {datesForDay[0].name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name}
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
