import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Printer, Plus, Trash2 } from "lucide-react";
import logo from "@/assets/logo-bonus-report.png";

interface ImplantationClient {
  id: string;
  code: string | null;
  name: string;
  group_name: string | null;
  profile: string | null;
  project_data: any;
}

interface ProjectFormProps {
  client: ImplantationClient;
  onSaved: () => void;
}

const PROFILES = [
  "PERFIL ANALÍTICO",
  "PERFIL COMUNICADOR",
  "PERFIL PRAGMÁTICO",
  "PERFIL EXPRESSIVO",
  "PERFIL EXPLOSIVO",
];

const REGIME_OPTIONS = ["MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real"];
const PORTE_OPTIONS = ["Pequeno", "Médio", "Grande"];
const ESTRUTURA_OPTIONS = ["Máquinas", "Impressora de Cupom", "Impressora de Etiquetas", "Balanças", "Consulta Preços"];
const SERVIDOR_OPTIONS = ["Local na filial", "Online Pirata", "Servidor Online Cliente", "Sem conexão"];
const BASE_DADOS_OPTIONS = ["Unificada", "Separada Central de Cadastro", "Totalmente Separada"];
const ATENDIMENTO_OPTIONS = ["Apenas Online", "Online e Presencial"];
const SISTEMA_OPTIONS = ["MultiPDV", "ERP"];
const MODULO_FISCAL_OPTIONS = ["NF-e / NFC-e", "Sintegra", "MDF-e / CT-e"];
const RISCO_OPTIONS = [
  "Inauguração iminente ou sem data",
  "Falta Certificado Digital",
  "Dados Fiscais faltando",
  "Pendência cliente",
  "Converte parcial",
];
const TRAINING_OPTIONS = [
  "Estoque", "Venda", "Financeiro/Resultados", "Dúvidas", "Reunião",
  "Reciclagem", "Balanço", "App de Resultados", "Caixa central e Contas Bancárias",
  "BI", "Plugtoo ou Tray Commerce", "Plataforma do contador", "CRM",
  "Meta", "Cash Back", "Coletor Zaal",
];

const DEFAULT_CRONOGRAMA = [
  { item: "Primeiro Atendimento", data: "" },
  { item: "Segundo Atendimento", data: "" },
  { item: "Terceiro Atendimento", data: "" },
];

interface ProjectData {
  numLojas: string;
  isGrupo: string;
  grupoNome: string;
  regimeTributario: string[];
  porte: string[];
  estrutura: string[];
  servidor: string[];
  baseDados: string[];
  ramo: string;
  metodoAtendimento: string[];
  proprietario: string;
  funcionarios: Array<{ funcao: string; quantidade: number }>;
  cronograma: Array<{ item: string; data: string }>;
  riscos: string[];
  riscoPendenciaDetalhe: string;
  sistema: string[];
  moduloFiscal: string[];
  conversao: string;
  planoTreinamento: string[];
  rotinasBasicas: string[];
  modulosComplementares: string[];
}

const DEFAULT_DATA: ProjectData = {
  numLojas: "",
  isGrupo: "",
  grupoNome: "",
  regimeTributario: [],
  porte: [],
  estrutura: [],
  servidor: [],
  baseDados: [],
  ramo: "",
  metodoAtendimento: [],
  proprietario: "",
  funcionarios: [],
  cronograma: [...DEFAULT_CRONOGRAMA],
  riscos: [],
  riscoPendenciaDetalhe: "",
  sistema: [],
  moduloFiscal: [],
  conversao: "",
  planoTreinamento: [],
  rotinasBasicas: [],
  modulosComplementares: [],
};

export default function ProjectForm({ client, onSaved }: ProjectFormProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<string>(client.profile || "");
  const [data, setData] = useState<ProjectData>(() => {
    const saved = client.project_data;
    if (saved && Object.keys(saved).length > 0) {
      return { ...DEFAULT_DATA, ...saved };
    }
    return { ...DEFAULT_DATA };
  });
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const updateField = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof ProjectData, item: string) => {
    const arr = data[key] as string[];
    if (arr.includes(item)) {
      updateField(key, arr.filter((v) => v !== item) as any);
    } else {
      updateField(key, [...arr, item] as any);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("implantation_clients")
      .update({
        profile: profile || null,
        project_data: data as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);

    if (error) {
      toast({ title: "Erro ao salvar projeto", variant: "destructive" });
    } else {
      toast({ title: "Projeto salvo com sucesso!" });
      onSaved();
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const addFuncionario = () => {
    updateField("funcionarios", [...data.funcionarios, { funcao: "", quantidade: 1 }]);
  };

  const removeFuncionario = (index: number) => {
    updateField("funcionarios", data.funcionarios.filter((_, i) => i !== index));
  };

  const updateFuncionario = (index: number, field: "funcao" | "quantidade", value: string | number) => {
    const updated = [...data.funcionarios];
    updated[index] = { ...updated[index], [field]: value };
    updateField("funcionarios", updated);
  };

  const totalFuncionarios = data.funcionarios.reduce((sum, f) => sum + (f.quantidade || 0), 0);

  const updateCronograma = (index: number, dateValue: string) => {
    const updated = [...data.cronograma];
    updated[index] = { ...updated[index], data: dateValue };
    updateField("cronograma", updated);
  };

  // Checkbox group helper
  const CheckboxGroup = ({
    options,
    selected,
    fieldKey,
    columns = 2,
  }: {
    options: string[];
    selected: string[];
    fieldKey: keyof ProjectData;
    columns?: number;
  }) => (
    <div className={`grid gap-2 ${columns === 3 ? "grid-cols-1 sm:grid-cols-3" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={() => toggleArrayItem(fieldKey, opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div ref={printRef} className="space-y-4 print-area">
      {/* Print header - visible only in print */}
      <div className="hidden print:block print:mb-6">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-4">
          <img src={logo} alt="Logo" className="h-12" />
          <div className="text-right">
            <h1 className="text-xl font-bold">Projeto de Implantação</h1>
            <p className="text-sm">Cliente: <strong>{client.name}</strong></p>
            {client.code && <p className="text-sm">Código: {client.code}</p>}
            {client.group_name && <p className="text-sm">Grupo: {client.group_name}</p>}
          </div>
        </div>
      </div>

      {/* Action buttons - no print */}
      <div className="flex gap-2 justify-end no-print print:hidden">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Projeto"}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir Projeto
        </Button>
      </div>

      {/* 1. Perfil do Cliente - NEVER print */}
      <Card className="no-print print:hidden border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perfil do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PROFILES.map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={profile === p}
                  onCheckedChange={() => setProfile(profile === p ? "" : p)}
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Número de lojas</Label>
            <Input
              value={data.numLojas}
              onChange={(e) => updateField("numLojas", e.target.value)}
              placeholder="Ex: 3"
            />
          </div>

          <div>
            <Label>Grupo</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={data.isGrupo === "sim"}
                  onCheckedChange={() => updateField("isGrupo", data.isGrupo === "sim" ? "" : "sim")}
                />
                <span>SIM</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={data.isGrupo === "nao"}
                  onCheckedChange={() => updateField("isGrupo", data.isGrupo === "nao" ? "" : "nao")}
                />
                <span>NÃO</span>
              </label>
            </div>
            {data.isGrupo === "sim" && (
              <Input
                className="mt-2"
                value={data.grupoNome}
                onChange={(e) => updateField("grupoNome", e.target.value)}
                placeholder="Nome do grupo"
              />
            )}
          </div>

          <div>
            <Label>Regime Tributário</Label>
            <div className="mt-1">
              <CheckboxGroup options={REGIME_OPTIONS} selected={data.regimeTributario} fieldKey="regimeTributario" />
            </div>
          </div>

          <div>
            <Label>Porte</Label>
            <div className="mt-1">
              <CheckboxGroup options={PORTE_OPTIONS} selected={data.porte} fieldKey="porte" columns={3} />
            </div>
          </div>

          <div>
            <Label>Estrutura</Label>
            <div className="mt-1">
              <CheckboxGroup options={ESTRUTURA_OPTIONS} selected={data.estrutura} fieldKey="estrutura" columns={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Conexão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Servidor</Label>
            <div className="mt-1">
              <CheckboxGroup options={SERVIDOR_OPTIONS} selected={data.servidor} fieldKey="servidor" />
            </div>
          </div>
          <div>
            <Label>Base de Dados</Label>
            <div className="mt-1">
              <CheckboxGroup options={BASE_DADOS_OPTIONS} selected={data.baseDados} fieldKey="baseDados" columns={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Escopo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escopo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ramo</Label>
            <Input
              value={data.ramo}
              onChange={(e) => updateField("ramo", e.target.value)}
              placeholder="Ex: Supermercado"
            />
          </div>
          <div>
            <Label>Método de Atendimento</Label>
            <div className="mt-1">
              <CheckboxGroup options={ATENDIMENTO_OPTIONS} selected={data.metodoAtendimento} fieldKey="metodoAtendimento" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Envolvidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Envolvidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Proprietário</Label>
            <Input
              value={data.proprietario}
              onChange={(e) => updateField("proprietario", e.target.value)}
              placeholder="Nome do proprietário"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Funcionários e Funções</Label>
              <Button variant="outline" size="sm" onClick={addFuncionario} className="no-print print:hidden">
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {data.funcionarios.map((f, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <Input
                  className="flex-1"
                  value={f.funcao}
                  onChange={(e) => updateFuncionario(i, "funcao", e.target.value)}
                  placeholder="Função (ex: Vendedor)"
                />
                <Input
                  className="w-20"
                  type="number"
                  min={0}
                  value={f.quantidade}
                  onChange={(e) => updateFuncionario(i, "quantidade", parseInt(e.target.value) || 0)}
                />
                <Button variant="ghost" size="icon" onClick={() => removeFuncionario(i)} className="no-print print:hidden text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {data.funcionarios.length > 0 && (
              <p className="text-sm font-medium text-muted-foreground">
                Total de pessoas: <strong className="text-foreground">{totalFuncionarios}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. Gerenciamento do Projeto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gerenciamento do Projeto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Cronograma</Label>
            <div className="space-y-2 mt-1">
              {data.cronograma.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm min-w-[180px]">{c.item}</span>
                  <Input
                    type="date"
                    value={c.data}
                    onChange={(e) => updateCronograma(i, e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label>Risco</Label>
            <div className="mt-1 space-y-2">
              {RISCO_OPTIONS.map((opt) => (
                <div key={opt}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={data.riscos.includes(opt)}
                      onCheckedChange={() => toggleArrayItem("riscos", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                  {opt === "Pendência cliente" && data.riscos.includes(opt) && (
                    <Input
                      className="mt-1 ml-6"
                      value={data.riscoPendenciaDetalhe}
                      onChange={(e) => updateField("riscoPendenciaDetalhe", e.target.value)}
                      placeholder="Descreva a pendência..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Software */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Software</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sistema</Label>
            <div className="mt-1">
              <CheckboxGroup options={SISTEMA_OPTIONS} selected={data.sistema} fieldKey="sistema" />
            </div>
          </div>
          <div>
            <Label>Módulo Fiscal</Label>
            <div className="mt-1">
              <CheckboxGroup options={MODULO_FISCAL_OPTIONS} selected={data.moduloFiscal} fieldKey="moduloFiscal" columns={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8. Conversão de Dados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversão de Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Conversão</Label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={data.conversao === "sim"}
                onCheckedChange={() => updateField("conversao", data.conversao === "sim" ? "" : "sim")}
              />
              <span>Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={data.conversao === "nao"}
                onCheckedChange={() => updateField("conversao", data.conversao === "nao" ? "" : "nao")}
              />
              <span>Não</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 9. Plano de Treinamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plano de Treinamento</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckboxGroup options={TRAINING_OPTIONS} selected={data.planoTreinamento} fieldKey="planoTreinamento" columns={3} />
        </CardContent>
      </Card>

      {/* 10. Rotinas Básicas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rotinas Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckboxGroup options={TRAINING_OPTIONS} selected={data.rotinasBasicas} fieldKey="rotinasBasicas" columns={3} />
        </CardContent>
      </Card>

      {/* 11. Módulos Complementares */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Módulos Complementares | Gerar Valor</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckboxGroup options={TRAINING_OPTIONS} selected={data.modulosComplementares} fieldKey="modulosComplementares" columns={3} />
        </CardContent>
      </Card>

      {/* Bottom save/print buttons - no print */}
      <div className="flex gap-2 justify-end pb-6 no-print print:hidden">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Projeto"}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir Projeto
        </Button>
      </div>
    </div>
  );
}
