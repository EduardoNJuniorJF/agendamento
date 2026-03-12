import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Download, Shield, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

interface BackupFile {
  name: string;
  created_at: string;
  metadata: { size: number } | null;
}

export default function DevTools() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [backingUp, setBackingUp] = useState(false);
  const [tableFilter, setTableFilter] = useState<string>("all");

  if (role !== "dev") {
    return <Navigate to="/" replace />;
  }

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["audit-logs", tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as AuditLogEntry[]) || [];
    },
  });

  // Fetch backup files
  const { data: backupFiles = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["backup-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("backups").list(undefined, {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return (data as unknown as BackupFile[]) || [];
    },
  });

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-database");
      if (error) throw error;
      toast.success(`Backup realizado! ${data.fileName} (${data.sizeKB} KB)`);
      refetchBackups();
    } catch (error: any) {
      toast.error("Erro ao realizar backup: " + error.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async (fileName: string) => {
    const { data, error } = await supabase.storage.from("backups").download(fileName);
    if (error) {
      toast.error("Erro ao baixar backup");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteBackup = async (fileName: string) => {
    const { error } = await supabase.storage.from("backups").remove([fileName]);
    if (error) {
      toast.error("Erro ao excluir backup");
      return;
    }
    toast.success("Backup excluído");
    refetchBackups();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-primary text-primary-foreground">INSERT</Badge>;
      case "UPDATE":
        return <Badge className="bg-accent text-accent-foreground">UPDATE</Badge>;
      case "DELETE":
        return <Badge variant="destructive">DELETE</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Ferramentas Dev</h1>
      </div>

      <Tabs defaultValue="backup">
        <TabsList>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" /> Backup
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        {/* BACKUP TAB */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup do Banco de Dados
              </CardTitle>
              <CardDescription>
                Backup semanal com retenção de 3 meses. Exporta todas as tabelas como JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleBackup} disabled={backingUp} className="gap-2">
                {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                {backingUp ? "Realizando backup..." : "Realizar Backup Agora"}
              </Button>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Backups Salvos</h3>
                  <Button variant="ghost" size="sm" onClick={() => refetchBackups()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {backupsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : backupFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum backup encontrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupFiles.map((file) => (
                        <TableRow key={file.name}>
                          <TableCell className="font-mono text-xs">{file.name}</TableCell>
                          <TableCell>
                            {file.created_at
                              ? format(new Date(file.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{file.metadata?.size ? formatFileSize(file.metadata.size) : "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadBackup(file.name)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteBackup(file.name)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Log de Auditoria
              </CardTitle>
              <CardDescription>
                Registro automático de INSERT, UPDATE e DELETE em tabelas críticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tabelas</SelectItem>
                    <SelectItem value="appointments">appointments</SelectItem>
                    <SelectItem value="appointment_agents">appointment_agents</SelectItem>
                    <SelectItem value="agents">agents</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum registro de auditoria encontrado.</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tabela</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>ID Registro</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {log.table_name}
                            </Badge>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[100px] truncate">
                            {log.record_id}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {log.action === "UPDATE" && log.old_data && log.new_data ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Ver alterações
                                </summary>
                                <div className="mt-1 space-y-1">
                                  {Object.keys(log.new_data).map((key) => {
                                    const oldVal = log.old_data?.[key];
                                    const newVal = log.new_data?.[key];
                                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal) && key !== "updated_at") {
                                      return (
                                        <div key={key} className="text-xs">
                                          <span className="font-medium">{key}:</span>{" "}
                                          <span className="text-destructive line-through">{String(oldVal ?? "null")}</span>{" "}
                                          → <span className="text-green-600">{String(newVal ?? "null")}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </details>
                            ) : log.action === "INSERT" && log.new_data ? (
                              <span className="text-xs text-muted-foreground">
                                {(log.new_data as any).title || (log.new_data as any).name || "Novo registro"}
                              </span>
                            ) : log.action === "DELETE" && log.old_data ? (
                              <span className="text-xs text-destructive">
                                {(log.old_data as any).title || (log.old_data as any).name || "Registro removido"}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
