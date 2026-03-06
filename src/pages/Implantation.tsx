import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, ArrowLeft, FolderOpen, Link, Check } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import ProjectForm from "@/components/implantation/ProjectForm";

interface ImplantationClient {
  id: string;
  code: string | null;
  name: string;
  group_name: string | null;
  profile: string | null;
  project_data: any;
  created_at: string;
  updated_at: string;
}

export default function Implantation() {
  const { toast } = useToast();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ImplantationClient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ImplantationClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Client dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ImplantationClient | null>(null);
  const [clientForm, setClientForm] = useState({ code: "", name: "", group_name: "" });

  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("implantation_clients").select("*").order("name");

    if (!error && data) {
      const clientsData = data as unknown as ImplantationClient[];
      setClients(clientsData);
      // Auto-select client from URL param
      if (clientId && !selectedClient) {
        const found = clientsData.find((c) => c.id === clientId);
        if (found) setSelectedClient(found);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.group_name?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const openCreateDialog = () => {
    setEditingClient(null);
    setClientForm({ code: "", name: "", group_name: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (client: ImplantationClient) => {
    setEditingClient(client);
    setClientForm({
      code: client.code || "",
      name: client.name,
      group_name: client.group_name || "",
    });
    setDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const payload = {
      code: clientForm.code.trim() || null,
      name: clientForm.name.trim(),
      group_name: clientForm.group_name.trim() || null,
    };

    if (editingClient) {
      const { error } = await supabase
        .from("implantation_clients")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingClient.id);

      if (error) {
        toast({ title: "Erro ao atualizar cliente", variant: "destructive" });
        return;
      }
      toast({ title: "Cliente atualizado com sucesso!" });
      // Update selected client if it was being edited
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient({ ...selectedClient, ...payload });
      }
    } else {
      const { error } = await supabase.from("implantation_clients").insert(payload);

      if (error) {
        toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
        return;
      }
      toast({ title: "Cliente cadastrado com sucesso!" });
    }

    setDialogOpen(false);
    loadClients();
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase.from("implantation_clients").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído com sucesso!" });
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
      loadClients();
    }
  };

  const handleSelectClient = (client: ImplantationClient) => {
    setSelectedClient(client);
    navigate(`/implantation/${client.id}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedClient(null);
    navigate("/implantation", { replace: true });
  };

  const handleCopyLink = (clientId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = `${window.location.origin}/implantation/${clientId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clientId);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProjectSaved = () => {
    loadClients();
  };

  // Project form view
  if (selectedClient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 no-print">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Projeto: {selectedClient.name}</h1>
            <p className="text-sm text-muted-foreground">
              {selectedClient.code && `Código: ${selectedClient.code} • `}
              {selectedClient.group_name && `Grupo: ${selectedClient.group_name}`}
            </p>
          </div>
        </div>

        <ProjectForm client={selectedClient} onSaved={handleProjectSaved} />
      </div>
    );
  }

  // Client list view
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Gestão de Projetos</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" /> Cadastrar Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, código ou grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando clientes...</p>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "Nenhum cliente encontrado com esse termo." : "Nenhum cliente cadastrado ainda."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleSelectClient(client)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  {client.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {client.code && <p className="text-sm text-muted-foreground">Código: {client.code}</p>}
                {client.group_name && <p className="text-sm text-muted-foreground">Grupo: {client.group_name}</p>}
                <div className="flex gap-1 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(client)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleCopyLink(client.id, e)}
                    title="Copiar link de acesso"
                  >
                    {copiedId === client.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link className="h-3.5 w-3.5" />}
                  </Button>
                  <ConfirmDeleteDialog
                    onConfirm={() => handleDeleteClient(client.id)}
                    title="Excluir Cliente"
                    description="Tem certeza que deseja excluir este cliente? Todos os dados do projeto serão perdidos."
                    triggerSize="sm"
                    triggerClassName=""
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código (opcional)</Label>
              <Input
                value={clientForm.code}
                onChange={(e) => setClientForm({ ...clientForm, code: e.target.value })}
                placeholder="Ex: CLI001"
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label>Grupo (opcional)</Label>
              <Input
                value={clientForm.group_name}
                onChange={(e) => setClientForm({ ...clientForm, group_name: e.target.value })}
                placeholder="Nome do grupo"
              />
            </div>
            <Button onClick={handleSaveClient} className="w-full">
              {editingClient ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
