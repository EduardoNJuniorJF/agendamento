import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserOption {
  id: string;
  full_name: string | null;
  username: string | null;
  sector: string | null;
}

interface PagePermission {
  page_name: string;
  can_access: boolean;
  can_edit: boolean;
}

const PAGES = [
  { name: "dashboard", label: "Dashboard" },
  { name: "calendar", label: "Calendário" },
  { name: "fleet", label: "Frota" },
  { name: "bonus", label: "Bonificação" },
  { name: "vacations", label: "Férias e Folgas" },
  { name: "team", label: "Equipe" },
  { name: "celebrations", label: "Celebrações" },
  { name: "implantation", label: "Implantação" },
  { name: "time_bank", label: "Banco de Horas" },
];

export default function UserPermissionsEditor() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) loadPermissions(selectedUserId);
  }, [selectedUserId]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, sector")
      .order("full_name");
    if (data) {
      // Hide dev user
      setUsers(data.filter((u) => u.username?.toLowerCase() !== "dev"));
    }
  };

  const loadPermissions = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("user_page_permissions")
      .select("page_name, can_access, can_edit")
      .eq("user_id", userId);

    // Merge with all pages (default false for those without override)
    const merged = PAGES.map((page) => {
      const existing = data?.find((p) => p.page_name === page.name);
      return {
        page_name: page.name,
        can_access: existing?.can_access ?? false,
        can_edit: existing?.can_edit ?? false,
      };
    });
    setPermissions(merged);
    setHasChanges(false);
    setLoading(false);
  };

  const toggleAccess = (pageName: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.page_name === pageName
          ? { ...p, can_access: !p.can_access, can_edit: !p.can_access ? p.can_edit : false }
          : p
      )
    );
    setHasChanges(true);
  };

  const toggleEdit = (pageName: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.page_name === pageName
          ? { ...p, can_edit: !p.can_edit, can_access: !p.can_edit ? true : p.can_access }
          : p
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);

    try {
      // Delete existing permissions for this user
      await supabase
        .from("user_page_permissions")
        .delete()
        .eq("user_id", selectedUserId);

      // Insert only overrides that have at least one permission enabled
      const toInsert = permissions
        .filter((p) => p.can_access || p.can_edit)
        .map((p) => ({
          user_id: selectedUserId,
          page_name: p.page_name,
          can_access: p.can_access,
          can_edit: p.can_edit,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("user_page_permissions")
          .insert(toInsert);
        if (error) throw error;
      }

      toast.success("Permissões salvas com sucesso!");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Selecione um usuário</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Escolha o usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.username || "Sem nome"} — {u.sector || "Sem setor"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Permissões
          </Button>
        )}
      </div>

      {selectedUserId && (
        <>
          {selectedUser && (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>Setor: <Badge variant="secondary">{selectedUser.sector || "—"}</Badge></span>
              <span className="text-xs">
                (Overrides se aplicam sobre as permissões padrão do setor/cargo)
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Página</TableHead>
                    <TableHead className="text-center">Pode Acessar</TableHead>
                    <TableHead className="text-center">Pode Editar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => {
                    const page = PAGES.find((p) => p.name === perm.page_name);
                    return (
                      <TableRow key={perm.page_name}>
                        <TableCell className="font-medium">{page?.label}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_access}
                            onCheckedChange={() => toggleAccess(perm.page_name)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_edit}
                            onCheckedChange={() => toggleEdit(perm.page_name)}
                            disabled={!perm.can_access}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {!selectedUserId && (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um usuário para gerenciar suas permissões individuais</p>
        </div>
      )}
    </div>
  );
}
