import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Gift, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  sector: string | null;
}

interface TimeBank {
  id: string;
  user_id: string;
  accumulated_hours: number;
  bonuses: number;
  profiles: { full_name: string | null; email: string } | null;
}

interface TimeBankTabProps {
  profiles: Profile[];
  onRefresh: () => void;
}

// Helper function to format hours as readable text
const formatHoursDisplay = (hours: number): string => {
  const absHours = Math.abs(hours);
  const fullDays = Math.floor(absHours / 8);
  const remainingHours = absHours % 8;
  
  if (absHours === 0) return "0 horas";
  
  let result = "";
  if (fullDays > 0) {
    result += `${fullDays} folga${fullDays > 1 ? 's' : ''} completa${fullDays > 1 ? 's' : ''}`;
  }
  if (remainingHours > 0) {
    if (fullDays > 0) result += " + ";
    result += `${remainingHours} hora${remainingHours !== 1 ? 's' : ''}`;
  }
  
  if (hours < 0) {
    return `Devendo ${result}`;
  }
  return result;
};

export default function TimeBankTab({ profiles, onRefresh }: TimeBankTabProps) {
  const [timeBank, setTimeBank] = useState<TimeBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({
    user_id: "",
    hours: 0,
    bonuses: 0,
    description: "",
  });

  useEffect(() => {
    loadTimeBank();
  }, []);

  const loadTimeBank = async () => {
    try {
      const { data, error } = await supabase
        .from("time_bank")
        .select("*, profiles(full_name, email)")
        .order("accumulated_hours", { ascending: false });

      if (error) throw error;
      setTimeBank(data as TimeBank[]);
    } catch (error) {
      console.error("Error loading time bank:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.user_id) {
      toast({
        title: "Erro",
        description: "Selecione um funcionário",
        variant: "destructive",
      });
      return;
    }

    if (form.hours === 0 && form.bonuses === 0) {
      toast({
        title: "Erro",
        description: "Informe ao menos horas ou abonos",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.rpc("upsert_time_bank", {
        p_user_id: form.user_id,
        p_hours_change: form.hours,
        p_bonus_change: form.bonuses,
        p_description: form.description || `Crédito manual: ${form.hours}h, ${form.bonuses} abono(s)`,
        p_transaction_type: "credit",
        p_created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Banco de horas atualizado!",
      });

      setForm({
        user_id: "",
        hours: 0,
        bonuses: 0,
        description: "",
      });

      loadTimeBank();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee: { id: string; name: string; accumulated_hours: number; bonuses: number }) => {
    setEditingUserId(employee.id);
    setForm({
      user_id: employee.id,
      hours: 0,
      bonuses: 0,
      description: "",
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setForm({
      user_id: "",
      hours: 0,
      bonuses: 0,
      description: "",
    });
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Deseja excluir este registro do banco de horas? Esta ação não pode ser desfeita.")) return;

    try {
      const { error } = await supabase
        .from("time_bank")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro excluído!",
      });

      loadTimeBank();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Only show employees that have time bank records
  const employeesWithBank = timeBank.map((tb) => ({
    id: tb.user_id,
    name: tb.profiles?.full_name || tb.profiles?.email || "Usuário",
    accumulated_hours: tb.accumulated_hours || 0,
    bonuses: tb.bonuses || 0,
  }));

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingUserId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingUserId ? "Ajustar Saldo" : "Cadastrar Horas/Abonos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="user">Funcionário *</Label>
                <Select
                  value={form.user_id}
                  onValueChange={(value) => setForm({ ...form, user_id: value })}
                  disabled={!!editingUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hours">Horas (+/-)</Label>
                <Input
                  id="hours"
                  type="number"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 8 ou -8"
                />
              </div>

              <div>
                <Label htmlFor="bonuses">Abonos (+/-)</Label>
                <Input
                  id="bonuses"
                  type="number"
                  value={form.bonuses}
                  onChange={(e) => setForm({ ...form, bonuses: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 1 ou -1"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Motivo do lançamento"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editingUserId ? "Atualizar" : "Registrar"}
              </Button>
              {editingUserId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Saldos do Banco de Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Funcionário</TableHead>
                  <TableHead className="min-w-[120px]">Horas Acumuladas</TableHead>
                  <TableHead className="min-w-[100px]">Abonos</TableHead>
                  <TableHead className="min-w-[200px]">Observação</TableHead>
                  <TableHead className="min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesWithBank.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum registro no banco de horas
                    </TableCell>
                  </TableRow>
                ) : (
                  employeesWithBank.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.accumulated_hours >= 0 ? "default" : "destructive"}
                          className="text-sm"
                        >
                          {employee.accumulated_hours >= 0 ? "+" : ""}
                          {employee.accumulated_hours}h
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.bonuses >= 0 ? "secondary" : "destructive"}
                          className="text-sm"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          {employee.bonuses >= 0 ? "+" : ""}
                          {employee.bonuses}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatHoursDisplay(employee.accumulated_hours)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
