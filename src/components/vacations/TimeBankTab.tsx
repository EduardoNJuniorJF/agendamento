import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  canEdit: boolean;
  onRefresh: () => void;
}

interface EmployeeWithBank {
  id: string;
  name: string;
  accumulated_hours: number;
  bonuses: number;
  bonus_breakdown: { bonus_type: string; quantity: number }[];
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

export default function TimeBankTab({ profiles, canEdit, onRefresh }: TimeBankTabProps) {
  const [timeBank, setTimeBank] = useState<TimeBank[]>([]);
  const [bonusBalances, setBonusBalances] = useState<Record<string, { bonus_type: string; quantity: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Bonus types options
  const BONUS_TYPES = [
    "TRE/TSE",
    "Liberado pela Chefia",
    "Troca de Feriado",
    "Atestado",
    "Licença Médica",
  ];


  // Form for new registrations
  const [form, setForm] = useState({
    user_id: "",
    hours: 0,
    bonuses: 0,
    bonus_type: "",
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithBank | null>(null);
  const [editForm, setEditForm] = useState({
    hours: 0,
  });
  const [editBonusChanges, setEditBonusChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTimeBank();
    loadBonusBalances();
  }, []);

  const loadBonusBalances = async () => {
    try {
      const { data, error } = await supabase
        .from("user_bonus_balances")
        .select("user_id, bonus_type, quantity")
        .gt("quantity", 0);

      if (error) throw error;

      const grouped: Record<string, { bonus_type: string; quantity: number }[]> = {};
      (data || []).forEach((row: any) => {
        if (!grouped[row.user_id]) grouped[row.user_id] = [];
        grouped[row.user_id].push({ bonus_type: row.bonus_type, quantity: Number(row.quantity) || 0 });
      });
      setBonusBalances(grouped);
    } catch (error) {
      console.error("Error loading bonus balances:", error);
    }
  };

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

    // Validate bonus type if adding bonuses
    if (form.bonuses > 0 && !form.bonus_type) {
      toast({
        title: "Erro",
        description: "Selecione o tipo de abono",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // If adding bonuses, use the new upsert_bonus_balance function
      if (form.bonuses !== 0 && form.bonus_type) {
        const { error: bonusError } = await supabase.rpc("upsert_bonus_balance", {
          p_user_id: form.user_id,
          p_bonus_type: form.bonus_type,
          p_quantity_change: form.bonuses,
          p_description: `Crédito manual: ${form.bonuses} abono(s) - ${form.bonus_type}`,
          p_created_by: user?.id,
        });
        if (bonusError) throw bonusError;
      }

      // If adding hours, use the existing upsert_time_bank function
      if (form.hours !== 0) {
        const { error: hoursError } = await supabase.rpc("upsert_time_bank", {
          p_user_id: form.user_id,
          p_hours_change: form.hours,
          p_bonus_change: 0,
          p_description: `Crédito manual: ${form.hours}h`,
          p_transaction_type: "credit",
          p_created_by: user?.id,
        });
        if (hoursError) throw hoursError;
      }

      toast({
        title: "Sucesso",
        description: "Banco de horas atualizado!",
      });

      setForm({
        user_id: "",
        hours: 0,
        bonuses: 0,
        bonus_type: "",
      });

      loadTimeBank();
      loadBonusBalances();
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

  const handleOpenEditDialog = (employee: EmployeeWithBank) => {
    setEditingEmployee(employee);
    setEditForm({
      hours: employee.accumulated_hours,
    });
    // Initialize bonus changes from current breakdown
    const bonusMap: Record<string, number> = {};
    employee.bonus_breakdown.forEach((b) => {
      bonusMap[b.bonus_type] = b.quantity;
    });
    setEditBonusChanges(bonusMap);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingEmployee(null);
    setEditForm({ hours: 0 });
    setEditBonusChanges({});
  };

  const handleEditSubmit = async () => {
    if (!editingEmployee) return;

    setSubmitting(true);

    try {
      // Calculate hours difference
      const hoursDiff = editForm.hours - editingEmployee.accumulated_hours;

      // Update hours if changed
      if (hoursDiff !== 0) {
        const { error: hoursError } = await supabase.rpc("upsert_time_bank", {
          p_user_id: editingEmployee.id,
          p_hours_change: hoursDiff,
          p_bonus_change: 0,
          p_description: `Ajuste manual: ${hoursDiff >= 0 ? '+' : ''}${hoursDiff}h`,
          p_transaction_type: "adjustment",
          p_created_by: user?.id,
        });
        if (hoursError) throw hoursError;
      }

      // Update each bonus type if changed
      for (const bonusType of BONUS_TYPES) {
        const currentQty = editingEmployee.bonus_breakdown.find((b) => b.bonus_type === bonusType)?.quantity || 0;
        const newQty = editBonusChanges[bonusType] || 0;
        const diff = newQty - currentQty;

        if (diff !== 0) {
          const { error: bonusError } = await supabase.rpc("upsert_bonus_balance", {
            p_user_id: editingEmployee.id,
            p_bonus_type: bonusType,
            p_quantity_change: diff,
            p_description: `Ajuste manual: ${diff >= 0 ? '+' : ''}${diff} ${bonusType}`,
            p_created_by: user?.id,
          });
          if (bonusError) throw bonusError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Saldo atualizado!",
      });

      handleCloseEditDialog();
      loadTimeBank();
      loadBonusBalances();
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

  const handleDelete = async (userId: string) => {
    if (!confirm("Deseja excluir este registro do banco de horas? Esta ação não pode ser desfeita.")) return;

    try {
      // Delete from time_bank
      const { error: timeBankError } = await supabase
        .from("time_bank")
        .delete()
        .eq("user_id", userId);

      if (timeBankError) throw timeBankError;

      // Also delete from user_bonus_balances
      const { error: bonusError } = await supabase
        .from("user_bonus_balances")
        .delete()
        .eq("user_id", userId);

      if (bonusError) throw bonusError;

      toast({
        title: "Sucesso",
        description: "Registro excluído!",
      });

      loadTimeBank();
      loadBonusBalances();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Show employees that have either a time bank record OR typed bonus balances
  const employeesWithBank: EmployeeWithBank[] = Array.from(
    new Set<string>([
      ...timeBank.map((tb) => tb.user_id),
      ...Object.keys(bonusBalances),
    ])
  ).map((userId) => {
    const tb = timeBank.find((row) => row.user_id === userId);
    const profile = profiles.find((p) => p.id === userId);

    const breakdown = bonusBalances[userId] || [];
    const typedTotal = breakdown.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    return {
      id: userId,
      name: profile?.full_name || profile?.email || tb?.profiles?.full_name || tb?.profiles?.email || "Usuário",
      accumulated_hours: tb?.accumulated_hours || 0,
      // Prefer typed bonus totals; fallback to legacy column
      bonuses: breakdown.length > 0 ? typedTotal : (tb?.bonuses || 0),
      bonus_breakdown: breakdown,
    };
  });

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form Card - Only visible if can edit */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Cadastrar Horas/Abonos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="user">Funcionário *</Label>
                  <Select
                    value={form.user_id}
                    onValueChange={(value) => setForm({ ...form, user_id: value })}
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

                {form.bonuses > 0 && (
                  <div>
                    <Label htmlFor="bonus_type">Tipo de Abono *</Label>
                    <Select
                      value={form.bonus_type}
                      onValueChange={(value) => setForm({ ...form, bonus_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BONUS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Obs:</strong> Atestado Médico e Licença Médica contabilizam apenas dias úteis.
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Registrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="min-w-[220px]">Tipos de Abono</TableHead>
                  <TableHead className="min-w-[200px]">Observação</TableHead>
                  {canEdit && <TableHead className="min-w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesWithBank.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground">
                        Nenhum registro no banco de horas
                      </TableCell>
                  </TableRow>
                ) : (
                  employeesWithBank.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-sm ${
                            employee.accumulated_hours >= 0 
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" 
                              : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
                          }`}
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
                      <TableCell className="text-sm">
                        {employee.bonus_breakdown.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {employee.bonus_breakdown.map((b) => (
                              <Badge key={b.bonus_type} variant="outline" className="text-xs">
                                {b.bonus_type}: {b.quantity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatHoursDisplay(employee.accumulated_hours)}
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenEditDialog(employee)}
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
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Saldo - {editingEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-hours">Horas Acumuladas</Label>
              <Input
                id="edit-hours"
                type="number"
                value={editForm.hours}
                onChange={(e) => setEditForm({ ...editForm, hours: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor atual: {editingEmployee?.accumulated_hours}h
              </p>
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Abonos por Tipo</Label>
              <div className="space-y-3 mt-2">
                {BONUS_TYPES.map((bonusType) => {
                  const currentQty = editingEmployee?.bonus_breakdown.find((b) => b.bonus_type === bonusType)?.quantity || 0;
                  return (
                    <div key={bonusType} className="flex items-center gap-2">
                      <Label className="text-sm flex-1 text-muted-foreground">{bonusType}</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={editBonusChanges[bonusType] ?? currentQty}
                        onChange={(e) => setEditBonusChanges({
                          ...editBonusChanges,
                          [bonusType]: parseFloat(e.target.value) || 0,
                        })}
                      />
                      <span className="text-xs text-muted-foreground w-16">
                        (atual: {currentQty})
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Obs:</strong> Atestado Médico e Licença Médica contabilizam apenas dias úteis.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
