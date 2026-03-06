import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, ArrowLeft, FolderOpen, Link, Check, FileText, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import ProjectForm from "@/components/implantation/ProjectForm";

interface ImplantationClient {
  id: string;
  code: string | null;
  name: string;
  group_name: string | null;
  group_code: string | null;
  created_at: string;
  updated_at: string;
}

interface ImplantationProject {
  id: string;
  client_id: string | null;
  name: string;
  profile: string | null;
  project_data: any;
  created_at: string;
  updated_at: string;
  // joined client info
  client_name?: string;
  client_code?: string | null;
  client_group?: string | null;
}

export default function Implantation() {
  const { toast } = useToast();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("projects");

  // Clients state
  const [clients, setClients] = useState<ImplantationClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ImplantationClient | null>(null);
  const [clientForm, setClientForm] = useState({ code: "", name: "", group_name: "", group_code: "" });

  // Projects state
  const [projects, setProjects] = useState<ImplantationProject[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<ImplantationProject | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);

  const loadClients = async () => {
    const { data } = await supabase.from("implantation_clients").select("*").order("name");
    if (data) setClients(data as unknown as ImplantationClient[]);
  };

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("implantation_projects" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch client names for each project
      const clientIds = [...new Set((data as any[]).filter(p => p.client_id).map(p => p.client_id))];
      let clientMap: Record<string, ImplantationClient> = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from("implantation_clients")
          .select("*")
          .in("id", clientIds);
        if (clientsData) {
          (clientsData as unknown as ImplantationClient[]).forEach(c => {
            clientMap[c.id] = c;
          });
        }
      }

      const projectsWithClients = (data as any[]).map(p => ({
        ...p,
        client_name: p.client_id ? clientMap[p.client_id]?.name : undefined,
        client_code: p.client_id ? clientMap[p.client_id]?.code : undefined,
        client_group: p.client_id ? clientMap[p.client_id]?.group_name : undefined,
      })) as ImplantationProject[];

      setProjects(projectsWithClients);

      // Auto-select project from URL
      if (projectId && !selectedProject) {
        const found = projectsWithClients.find(p => p.id === projectId);
        if (found) setSelectedProject(found);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
    loadProjects();
  }, []);

  // Filtered lists
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      c => c.name.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.group_name?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (showOnlyCompleted) {
      list = list.filter(p => p.project_data?.concluido === true);
    }
    if (!projectSearch.trim()) return list;
    const q = projectSearch.toLowerCase();
    return list.filter(
      p => p.name.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q) || p.client_code?.toLowerCase().includes(q)
    );
  }, [projects, projectSearch, showOnlyCompleted]);

  const handleToggleConcluido = async (project: ImplantationProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !(project.project_data?.concluido === true);
    const newData = { ...(project.project_data || {}), concluido: newVal };
    await supabase
      .from("implantation_projects" as any)
      .update({ project_data: newData, updated_at: new Date().toISOString() } as any)
      .eq("id", project.id);
    loadProjects();
  };

  // Client CRUD
  const openCreateClientDialog = () => {
    setEditingClient(null);
    setClientForm({ code: "", name: "", group_name: "", group_code: "" });
    setClientDialogOpen(true);
  };

  const openEditClientDialog = (client: ImplantationClient) => {
    setEditingClient(client);
    setClientForm({ code: client.code || "", name: client.name, group_name: client.group_name || "", group_code: (client as any).group_code || "" });
    setClientDialogOpen(true);
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
      group_code: clientForm.group_code.trim() || null,
    };
    if (editingClient) {
      const { error } = await supabase
        .from("implantation_clients")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingClient.id);
      if (error) { toast({ title: "Erro ao atualizar cliente", variant: "destructive" }); return; }
      toast({ title: "Cliente atualizado com sucesso!" });
    } else {
      const { error } = await supabase.from("implantation_clients").insert(payload);
      if (error) { toast({ title: "Erro ao cadastrar cliente", variant: "destructive" }); return; }
      toast({ title: "Cliente cadastrado com sucesso!" });
    }
    setClientDialogOpen(false);
    loadClients();
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase.from("implantation_clients").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído com sucesso!" });
      loadClients();
    }
  };

  // Project CRUD
  const handleCreateProject = async () => {
    const { data, error } = await supabase
      .from("implantation_projects" as any)
      .insert({ name: "Novo Projeto" } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar projeto", variant: "destructive" });
      return;
    }
    toast({ title: "Projeto criado!" });
    const project = data as unknown as ImplantationProject;
    setSelectedProject(project);
    navigate(`/implantation/${project.id}`, { replace: true });
    loadProjects();
  };

  const handleSelectProject = (project: ImplantationProject) => {
    setSelectedProject(project);
    navigate(`/implantation/${project.id}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedProject(null);
    navigate("/implantation", { replace: true });
  };

  const handleCopyLink = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = `${window.location.origin}/implantation/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from("implantation_projects" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir projeto", variant: "destructive" });
    } else {
      toast({ title: "Projeto excluído!" });
      if (selectedProject?.id === id) { setSelectedProject(null); navigate("/implantation", { replace: true }); }
      loadProjects();
    }
  };

  const handleProjectSaved = () => {
    loadProjects();
  };

  // Project detail view
  if (selectedProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 no-print">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{selectedProject.name}</h1>
            {selectedProject.client_name && (
              <p className="text-sm text-muted-foreground">
                Cliente: {selectedProject.client_name}
                {selectedProject.client_code && ` • Código: ${selectedProject.client_code}`}
              </p>
            )}
          </div>
        </div>
        <ProjectForm project={selectedProject} clients={clients} onSaved={handleProjectSaved} />
      </div>
    );
  }

  // List view with tabs
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Gestão de Projetos</h1>
        <div className="flex gap-2">
          <Button onClick={openCreateClientDialog} variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Cadastrar Cliente
          </Button>
          <Button onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-1" /> Novo Projeto
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do projeto ou cliente..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando projetos...</p>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {projectSearch ? "Nenhum projeto encontrado." : "Nenhum projeto cadastrado ainda. Clique em \"Novo Projeto\" para começar."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleSelectProject(project)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {project.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {project.client_name ? (
                      <p className="text-sm text-muted-foreground">Cliente: {project.client_name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sem cliente associado</p>
                    )}
                    {project.client_code && <p className="text-sm text-muted-foreground">Código: {project.client_code}</p>}
                    <div className="flex gap-1 pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleCopyLink(project.id, e)}
                        title="Copiar link de acesso"
                      >
                        {copiedId === project.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link className="h-3.5 w-3.5" />}
                      </Button>
                      <ConfirmDeleteDialog
                        onConfirm={() => handleDeleteProject(project.id)}
                        title="Excluir Projeto"
                        description="Tem certeza que deseja excluir este projeto? Todos os dados serão perdidos."
                        triggerSize="sm"
                        triggerClassName=""
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou grupo..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {clientSearch ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <Card key={client.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      {client.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {client.code && <p className="text-sm text-muted-foreground">Código: {client.code}</p>}
                    {client.group_name && <p className="text-sm text-muted-foreground">Grupo: {client.group_name}</p>}
                    <div className="flex gap-1 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditClientDialog(client)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <ConfirmDeleteDialog
                        onConfirm={() => handleDeleteClient(client.id)}
                        title="Excluir Cliente"
                        description="Tem certeza que deseja excluir este cliente? Projetos associados perderão o vínculo."
                        triggerSize="sm"
                        triggerClassName=""
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
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
            <div>
              <Label>Código do Grupo (opcional)</Label>
              <Input
                value={clientForm.group_code}
                onChange={(e) => setClientForm({ ...clientForm, group_code: e.target.value })}
                placeholder="Ex: GRP001"
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
