import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Pencil, Trash2 } from "lucide-react";

const permissions = [
  {
    page: "Dashboard",
    rules: [
      { sector: "Comercial", admin: "Completo", user: "Completo", financeiro: "Visualizar" },
      { sector: "Administrativo", admin: "Completo", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Suporte", admin: "Apenas Férias", user: "Apenas Férias", financeiro: "Apenas Férias" },
      { sector: "Desenvolvimento", admin: "Apenas Férias", user: "Apenas Férias", financeiro: "Apenas Férias" },
      { sector: "Loja", admin: "Apenas Férias", user: "Apenas Férias", financeiro: "Apenas Férias" },
    ],
  },
  {
    page: "Calendário",
    rules: [
      { sector: "Comercial", admin: "CRUD", user: "CRUD", financeiro: "Visualizar" },
      { sector: "Administrativo", admin: "Visualizar", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Suporte", admin: "—", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "—", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "—", user: "—", financeiro: "—" },
    ],
  },
  {
    page: "Frota",
    rules: [
      { sector: "Comercial", admin: "CRUD", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Administrativo", admin: "Visualizar", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Suporte", admin: "—", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "—", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "—", user: "—", financeiro: "—" },
    ],
  },
  {
    page: "Bonificação",
    rules: [
      { sector: "Comercial", admin: "CRUD + Config", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Administrativo", admin: "Visualizar", user: "Visualizar", financeiro: "Visualizar" },
      { sector: "Suporte", admin: "—", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "—", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "—", user: "—", financeiro: "—" },
    ],
  },
  {
    page: "Férias e Folgas",
    rules: [
      { sector: "Comercial", admin: "CRUD (próprio setor)", user: "Visualizar (próprio setor)", financeiro: "Visualizar (próprio setor)" },
      { sector: "Administrativo", admin: "CRUD (todos os setores)", user: "Visualizar (todos)", financeiro: "Visualizar (todos)" },
      { sector: "Suporte", admin: "CRUD (próprio setor)", user: "Visualizar (próprio setor)", financeiro: "Visualizar (próprio setor)" },
      { sector: "Desenvolvimento", admin: "CRUD (próprio setor)", user: "Visualizar (próprio setor)", financeiro: "Visualizar (próprio setor)" },
      { sector: "Loja", admin: "CRUD (próprio setor)", user: "Visualizar (próprio setor)", financeiro: "Visualizar (próprio setor)" },
    ],
  },
  {
    page: "Banco de Horas",
    rules: [
      { sector: "Comercial", admin: "—", user: "—", financeiro: "—" },
      { sector: "Administrativo", admin: "—", user: "—", financeiro: "—" },
      { sector: "Suporte", admin: "—", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "—", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "—", user: "—", financeiro: "—" },
    ],
    note: "Visível e editável apenas para role Dev",
  },
  {
    page: "Gestão de Usuários",
    rules: [
      { sector: "Comercial", admin: "CRUD (todos os setores)", user: "—", financeiro: "—" },
      { sector: "Administrativo", admin: "Visualizar todos, editar próprio setor", user: "—", financeiro: "—" },
      { sector: "Suporte", admin: "CRUD (próprio setor)", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "CRUD (próprio setor)", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "CRUD (próprio setor)", user: "—", financeiro: "—" },
    ],
  },
  {
    page: "Implantação",
    rules: [
      { sector: "Comercial", admin: "CRUD", user: "CRUD", financeiro: "Visualizar" },
      { sector: "Administrativo", admin: "—", user: "—", financeiro: "—" },
      { sector: "Suporte", admin: "—", user: "—", financeiro: "—" },
      { sector: "Desenvolvimento", admin: "—", user: "—", financeiro: "—" },
      { sector: "Loja", admin: "—", user: "—", financeiro: "—" },
    ],
  },
];

function PermissionBadge({ value }: { value: string }) {
  if (value === "—") return <span className="text-muted-foreground">—</span>;
  if (value.includes("CRUD")) return <Badge variant="default" className="text-[10px] bg-primary/90">{value}</Badge>;
  if (value.includes("Completo")) return <Badge variant="default" className="text-[10px] bg-primary/90">{value}</Badge>;
  if (value.includes("Visualizar")) return <Badge variant="secondary" className="text-[10px]">{value}</Badge>;
  if (value.includes("Apenas")) return <Badge variant="outline" className="text-[10px]">{value}</Badge>;
  return <Badge variant="outline" className="text-[10px]">{value}</Badge>;
}

export default function PermissionsMatrix() {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>Matriz de permissões do sistema. O usuário <strong>Dev</strong> possui acesso total e irrestrito a todas as páginas e funcionalidades.</p>
      </div>

      {permissions.map((perm) => (
        <div key={perm.page} className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 font-semibold text-sm flex items-center gap-2">
            {perm.page}
            {perm.note && <span className="text-xs font-normal text-muted-foreground">({perm.note})</span>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Setor</TableHead>
                <TableHead>Administrador</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Leitor (Financeiro)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perm.rules.map((rule) => (
                <TableRow key={rule.sector}>
                  <TableCell className="font-medium text-xs">{rule.sector}</TableCell>
                  <TableCell><PermissionBadge value={rule.admin} /></TableCell>
                  <TableCell><PermissionBadge value={rule.user} /></TableCell>
                  <TableCell><PermissionBadge value={rule.financeiro} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
