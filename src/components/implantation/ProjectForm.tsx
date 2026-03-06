import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { Save, Printer, Plus, Trash2, HelpCircle, Search, X } from "lucide-react";
import logo from "@/assets/logo-bonus-report.png";

interface ImplantationClient {
  id: string;
  code: string | null;
  name: string;
  group_name: string | null;
}

interface ImplantationProject {
  id: string;
  client_id: string | null;
  name: string;
  profile: string | null;
  project_data: any;
  client_name?: string;
  client_code?: string | null;
  client_group?: string | null;
}

interface ProjectFormProps {
  project: ImplantationProject;
  clients: ImplantationClient[];
  onSaved: () => void;
}

const PROFILES = [
  "PERFIL ANALÍTICO",
  "PERFIL COMUNICADOR",
  "PERFIL PRAGMÁTICO",
  "PERFIL EXPRESSIVO",
  "PERFIL EXPLOSIVO",
];

const PROFILE_INFO: Record<
  string,
  {
    caracteristicas: string[];
    positivos: string[];
    negativos: string[];
    atendimento: string[];
    negociacao: string[];
    recuperar: string;
    dicaChave: string;
  }
> = {
  "PERFIL ANALÍTICO": {
    caracteristicas: [
      "Extremamente racional, detalhista e cuidadoso nas decisões.",
      "Valoriza dados, comparativos, segurança e estabilidade.",
      'Gosta de entender o "como" e o "porquê" das coisas.',
      "Evita riscos e não decide por impulso.",
    ],
    positivos: [
      "Leal e consistente quando confia.",
      "Dá pouco trabalho após o fechamento, pois segue processos.",
      "Valoriza empresas organizadas e que demonstram domínio técnico.",
    ],
    negativos: [
      "Demora na tomada de decisão.",
      "Questiona detalhes técnicos em excesso.",
      "Pode parecer frio ou desconfiado.",
    ],
    atendimento: [
      "Seja objetivo, técnico e claro nas respostas.",
      "Tenha dados concretos: números, prints, resultados e prazos.",
      "Mostre segurança e domínio do sistema, sem improvisos.",
      "Evite promessas vagas ou generalizações.",
    ],
    negociacao: [
      "Apresente comparativos: custo-benefício, estabilidade e suporte.",
      'Mostre métricas ("reduz X horas", "melhora controle fiscal em Y%").',
      "Evite pressão: o analítico recua diante de urgência comercial.",
    ],
    recuperar:
      '"Notei que havíamos interrompido nossa conversa. Fiz uma revisão nas soluções que você analisou e posso te mostrar o que realmente faz diferença em controle e segurança de dados."',
    dicaChave:
      'Pergunta muito "como funciona?" ou "o que acontece se...?" (Sempre quer entender o processo antes de confiar.)',
  },
  "PERFIL COMUNICADOR": {
    caracteristicas: [
      "Extrovertido, entusiasmado e voltado para o relacionamento.",
      "Gosta de se sentir valorizado e reconhecido.",
      "Decide com base em emoção, empatia e identificação.",
      "Conversa muito e muda de assunto com facilidade.",
    ],
    positivos: [
      "Traz boas indicações e influencia outros lojistas.",
      "Cria vínculo e tende a ser fiel quando se sente ouvido.",
      "Adere bem a novidades e campanhas.",
    ],
    negativos: [
      "Dispersa-se rápido e pode esquecer compromissos.",
      "Pode prometer retorno e não responder.",
      "Reage mal a comunicações frias ou muito técnicas.",
    ],
    atendimento: [
      "Seja simpático e use o nome dele sempre.",
      "Mostre interesse genuíno no negócio e conquistas.",
      "Evite jargões técnicos; use uma linguagem leve e visual.",
      "Elogie resultados ou melhorias que ele adotou.",
    ],
    negociacao: [
      'Destaque benefícios práticos e rápidos ("vai facilitar sua rotina").',
      "Use exemplos de outras lojas satisfeitas.",
      'Faça ele se sentir parte de algo maior ("outros clientes como você estão usando e amando").',
    ],
    recuperar:
      '"Não esqueci de você! Vi que paramos a conversa e pensei em te atualizar com as melhorias que saíram no sistema. Tem coisa boa que acho que vai te animar!"',
    dicaChave: "Fala muito, conta histórias e demonstra empolgação. (Ganha confiança por afinidade e simpatia.)",
  },
  "PERFIL PRAGMÁTICO": {
    caracteristicas: [
      "Objetivo, prático e direto.",
      "Valoriza resultado e tempo.",
      "Foca no essencial e detesta enrolação.",
      "Decide rápido se perceber utilidade clara.",
    ],
    positivos: [
      "Fecha rápido quando vê vantagem concreta.",
      "É fiel se o produto entrega o prometido.",
      "Excelente para cases de sucesso.",
    ],
    negativos: [
      "Impaciente com explicações longas.",
      "Pouco sensível a apelos emocionais.",
      "Cobra prazos e resultados de forma dura.",
    ],
    atendimento: [
      "Vá direto ao ponto, sem rodeios.",
      "Mostre soluções rápidas e funcionais.",
      "Entregue o que foi combinado com eficiência.",
    ],
    negociacao: [
      "Mostre economia de tempo e custo.",
      "Foque no retorno imediato do investimento.",
      "Evite apresentações longas ou técnicas demais.",
    ],
    recuperar:
      '"Revendo aqui seu histórico, percebi que você buscava agilidade e praticidade. Posso te mostrar uma forma mais direta de chegar nisso, sem complicação."',
    dicaChave: 'Pergunta "quanto custa?", "funciona bem?", "é rápido?". (Quer resultado, não detalhes.)',
  },
  "PERFIL EXPRESSIVO": {
    caracteristicas: [
      "Criativo, visionário e empolgado.",
      "Gosta de novidades, tendências e diferenciais.",
      "Quer que o sistema ajude o negócio a se destacar.",
      "Decide por percepção de valor e inovação.",
    ],
    positivos: [
      "Aberto a upgrades e produtos premium.",
      "Gera conteúdo e indica espontaneamente.",
      "Valoriza marca e imagem da empresa.",
    ],
    negativos: [
      "Impulsivo, pode se arrepender depois.",
      "Fica entediado com informações repetitivas.",
      "Desvaloriza detalhes técnicos e rotinas.",
    ],
    atendimento: [
      "Mostre novidades e melhorias constantemente.",
      'Use uma linguagem inspiradora ("imagine poder...", "agora você vai conseguir...").',
      "Envolva o cliente em ideias e possibilidades.",
    ],
    negociacao: [
      "Apresente diferenciais do sistema (design, automação, integração).",
      'Mostre que ele será "pioneiro" ao adotar antes dos outros.',
      "Evite falar muito de preço; fale de valor percebido.",
    ],
    recuperar:
      '"Lembrei de uma melhoria que encaixa muito bem com o que você buscava lá atrás, algo que pode deixar sua operação ainda mais moderna."',
    dicaChave: 'Usa palavras como "ideia", "inovação", "legal", "diferente". (Gosta de se sentir único e inovador.)',
  },
  "PERFIL EXPLOSIVO": {
    caracteristicas: [
      "Temperamento forte, direto e por vezes agressivo.",
      "Exige agilidade e respostas imediatas.",
      "Costuma estar sob pressão e não gosta de justificativas.",
      "Valoriza postura firme e profissionalismo.",
    ],
    positivos: [
      "Resolve rápido quando confia.",
      "Respeita quem demonstra autoridade técnica.",
      "É fiel a quem entrega sem enrolação.",
    ],
    negativos: [
      "Reage mal a atrasos e erros.",
      "Pode elevar o tom em momentos de estresse.",
      "Impaciente com processos demorados.",
    ],
    atendimento: [
      "Mantenha a calma e responda com firmeza e respeito.",
      "Vá direto ao ponto e evite se justificar demais.",
      "Mostre controle da situação e ofereça soluções concretas.",
      'Nunca confronte ou tente "provar" que ele está errado.',
    ],
    negociacao: [
      "Fale com clareza e segurança, sem hesitar.",
      "Deixe claro que você tem o controle do processo.",
      "Mostre vantagens em tempo, segurança e autoridade técnica.",
    ],
    recuperar:
      '"Percebi que na época tivemos alguns impasses. Gostaria de te mostrar o que evoluiu no sistema desde então, de forma direta e sem enrolação."',
    dicaChave: "Tom de voz firme, fala curta e impaciente. (Quer resultado imediato e respeito à sua autoridade.)",
  },
};

const ProfileInfoPopover = ({ profileName }: { profileName: string }) => {
  const info = PROFILE_INFO[profileName];
  if (!info) return null;
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <div className="mb-2">
      <p className="font-semibold text-xs text-primary">{title}</p>
      <ul className="list-disc ml-4 text-xs space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full h-5 w-5 border border-green-500 text-green-600 hover:text-green-700 hover:border-green-600 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(92vw,32rem)] max-h-[75vh] overflow-y-auto p-4"
        side="right"
        align="start"
        sideOffset={8}
      >
        <h4 className="font-bold text-sm mb-3">{profileName}</h4>
        <Section title="Características" items={info.caracteristicas} />
        <Section title="Pontos Positivos" items={info.positivos} />
        <Section title="Pontos Negativos" items={info.negativos} />
        <Section title="Atendimento" items={info.atendimento} />
        <Section title="Negociação" items={info.negociacao} />
        <div className="mb-2">
          <p className="font-semibold text-xs text-primary">Recuperar Oportunidade</p>
          <p className="text-xs italic ml-1">{info.recuperar}</p>
        </div>
        <div className="mb-2 pr-2">
          <p className="font-semibold text-xs text-primary">Dica-Chave de Identificação</p>
          <p className="text-xs ml-1">{info.dicaChave}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  "Estoque",
  "Venda",
  "Financeiro/Resultados",
  "Dúvidas",
  "Reunião",
  "Reciclagem",
  "Balanço",
  "App de Resultados",
  "Caixa central e Contas Bancárias",
  "BI",
  "Plugtoo ou Tray Commerce",
  "Plataforma do contador",
  "CRM",
  "Meta",
  "Cash Back",
  "Coletor Zaal",
];
const MODULOS_OPTIONS = [
  "App de Resultados",
  "Caixa central e Contas Bancárias",
  "BI",
  "Plugtoo ou Tray Commerce",
  "Plataforma do contador",
  "CRM",
  "Meta",
  "Cash Back",
  "Coletor Zaal",
];

const DEFAULT_CRONOGRAMA = [
  { item: "Primeiro Atendimento", data: "" },
  { item: "Segundo Atendimento", data: "" },
  { item: "Terceiro Atendimento", data: "" },
];

interface EtapaData {
  items: string[];
  data: string;
  dataFim?: string;
}

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
  treinamentoEtapas: {
    etapa1: EtapaData;
    etapa2: EtapaData;
    etapa3: EtapaData;
  };
}

const DEFAULT_ETAPAS = {
  etapa1: { items: [] as string[], data: "", dataFim: "" },
  etapa2: { items: [] as string[], data: "" },
  etapa3: { items: [] as string[], data: "" },
};

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
  treinamentoEtapas: { ...DEFAULT_ETAPAS },
};

// Client search component
function ClientSearch({
  clients,
  selectedClientId,
  onSelect,
}: {
  clients: ImplantationClient[];
  selectedClientId: string | null;
  onSelect: (clientId: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.group_name?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  if (selectedClient) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
        <div className="flex-1">
          <p className="text-sm font-medium">{selectedClient.name}</p>
          {selectedClient.code && (
            <p className="text-xs text-muted-foreground">Código: {selectedClient.code}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar cliente por nome, código ou grupo..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-10"
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  onSelect(c.id);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{c.name}</span>
                {c.code && <span className="text-muted-foreground ml-2">({c.code})</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectForm({ project, clients, onSaved }: ProjectFormProps) {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState(project.name);
  const [clientId, setClientId] = useState<string | null>(project.client_id);
  const [profile, setProfile] = useState<string>(project.profile || "");
  const [data, setData] = useState<ProjectData>(() => {
    const saved = project.project_data;
    if (saved && Object.keys(saved).length > 0) {
      return { ...DEFAULT_DATA, ...saved };
    }
    return { ...DEFAULT_DATA };
  });
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === clientId);

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
      .from("implantation_projects" as any)
      .update({
        name: projectName.trim() || "Sem nome",
        client_id: clientId,
        profile: profile || null,
        project_data: JSON.parse(JSON.stringify(data)),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", project.id);

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
    updateField(
      "funcionarios",
      data.funcionarios.filter((_, i) => i !== index),
    );
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
    <div
      className={`grid gap-2 ${columns === 3 ? "grid-cols-1 sm:grid-cols-3" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggleArrayItem(fieldKey, opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
  // Print helper components
  const PrintSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3" style={{ pageBreakInside: "avoid" }}>
      <h3 className="font-bold text-sm border-b border-gray-400 pb-1 mb-2">{title}</h3>
      <div className="pl-2">{children}</div>
    </div>
  );

  const PrintLine = ({ label, value }: { label: string; value: string }) => (
    <p>
      <span className="font-semibold">{label}:</span> {value || "—"}
    </p>
  );

  return (
    <div ref={printRef} className="space-y-4 print-area">
      {/* Print header - visible only in print */}
      <div className="hidden print:block print:mb-6">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-4">
          <img src={logo} alt="Logo" className="h-12" />
          <div className="text-right">
            <h1 className="text-xl font-bold">Projeto de Implantação</h1>
            <p className="text-sm">
              Projeto: <strong>{projectName}</strong>
            </p>
            {selectedClient && (
              <>
                <p className="text-sm">
                  Cliente: <strong>{selectedClient.name}</strong>
                </p>
                {selectedClient.code && <p className="text-sm">Código: {selectedClient.code}</p>}
                {selectedClient.group_name && <p className="text-sm">Grupo: {selectedClient.group_name}</p>}
              </>
            )}
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

      {/* ===== INTERACTIVE FORM (screen only) ===== */}
      <div className="no-print print:hidden space-y-4">
        {/* Project name and client association */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Projeto *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
            <div>
              <Label>Cliente Associado</Label>
              <div className="mt-1">
                <ClientSearch
                  clients={clients}
                  selectedClientId={clientId}
                  onSelect={setClientId}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1. Perfil do Cliente - NEVER print */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Perfil do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PROFILES.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={profile === p} onCheckedChange={() => setProfile(profile === p ? "" : p)} />
                    <span>{p}</span>
                  </label>
                  <ProfileInfoPopover profileName={p} />
                </div>
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
              <Select
                value={data.regimeTributario[0] || ""}
                onValueChange={(v) => updateField("regimeTributario", [v])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {REGIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porte</Label>
              <Select
                value={data.porte[0] || ""}
                onValueChange={(v) => updateField("porte", [v])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PORTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={data.servidor[0] || ""}
                onValueChange={(v) => updateField("servidor", [v])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SERVIDOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base de Dados</Label>
              <Select
                value={data.baseDados[0] || ""}
                onValueChange={(v) => updateField("baseDados", [v])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {BASE_DADOS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <CheckboxGroup
                  options={ATENDIMENTO_OPTIONS}
                  selected={data.metodoAtendimento}
                  fieldKey="metodoAtendimento"
                />
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
                <Button variant="outline" size="sm" onClick={addFuncionario}>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFuncionario(i)}
                    className="text-destructive hover:text-destructive"
                  >
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
              <Select
                value={data.sistema[0] || ""}
                onValueChange={(v) => updateField("sistema", [v])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SISTEMA_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Módulo Fiscal</Label>
              <div className="mt-1">
                <CheckboxGroup
                  options={MODULO_FISCAL_OPTIONS}
                  selected={data.moduloFiscal}
                  fieldKey="moduloFiscal"
                  columns={3}
                />
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

        {/* 9-11. Training sections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plano de Treinamento | Rotinas Básicas</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={TRAINING_OPTIONS}
              selected={data.planoTreinamento}
              fieldKey="planoTreinamento"
              columns={3}
            />
            <div className="mt-4 p-3 bg-muted/50 border border-border rounded-md text-sm text-muted-foreground no-print space-y-1">
              <p className="font-medium text-foreground">Observação:</p>
              <p>Em caso se conversão, as 2 primeiras etapas são realizadas em 2 dias seguidos de treinamento.</p>
              <p>Venda e estoque são realizados na etapa 1.</p>
              <p>Etapa 2: Dúvidas e retorno.</p>
              <p>Etapa 3: Processos complementares, podendo haver etapa 4.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Módulos Complementares | Gerar Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={MODULOS_OPTIONS}
              selected={data.modulosComplementares}
              fieldKey="modulosComplementares"
              columns={3}
            />
          </CardContent>
        </Card>

        {/* Bottom save/print buttons */}
        <div className="flex gap-2 justify-end pb-6">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Projeto"}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir Projeto
          </Button>
        </div>
      </div>

      {/* ===== PRINT-ONLY TEXT VERSION ===== */}
      <div className="hidden print:block print-text-version text-sm" style={{ fontSize: "11px", lineHeight: "1.6" }}>
        <PrintSection title="Empresa">
          <PrintLine label="Número de lojas" value={data.numLojas} />
          <PrintLine
            label="Grupo"
            value={
              data.isGrupo === "sim"
                ? `Sim — ${data.grupoNome || "(não informado)"}`
                : data.isGrupo === "nao"
                  ? "Não"
                  : ""
            }
          />
          <PrintLine label="Regime Tributário" value={data.regimeTributario.join(", ")} />
          <PrintLine label="Porte" value={data.porte.join(", ")} />
          <PrintLine label="Estrutura" value={data.estrutura.join(", ")} />
        </PrintSection>

        <PrintSection title="Conexão">
          <PrintLine label="Servidor" value={data.servidor.join(", ")} />
          <PrintLine label="Base de Dados" value={data.baseDados.join(", ")} />
        </PrintSection>

        <PrintSection title="Escopo">
          <PrintLine label="Ramo" value={data.ramo} />
          <PrintLine label="Método de Atendimento" value={data.metodoAtendimento.join(", ")} />
        </PrintSection>

        <PrintSection title="Envolvidos">
          <PrintLine label="Proprietário" value={data.proprietario} />
          {data.funcionarios.length > 0 && (
            <div className="mt-1">
              <span className="font-semibold">Funcionários e Funções:</span>
              <ul className="list-disc ml-6 mt-1">
                {data.funcionarios.map((f, i) => (
                  <li key={i}>
                    {f.funcao || "(sem função)"}: {f.quantidade}
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-semibold">Total de pessoas: {totalFuncionarios}</p>
            </div>
          )}
        </PrintSection>

        <PrintSection title="Gerenciamento do Projeto">
          <span className="font-semibold">Cronograma:</span>
          <ul className="list-disc ml-6 mt-1">
            {data.cronograma.map((c, i) => (
              <li key={i}>
                {c.item}: {c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
              </li>
            ))}
          </ul>
          {data.riscos.length > 0 && (
            <div className="mt-2">
              <span className="font-semibold">Riscos:</span>
              <ul className="list-disc ml-6 mt-1">
                {data.riscos.map((r, i) => (
                  <li key={i}>
                    {r}
                    {r === "Pendência cliente" && data.riscoPendenciaDetalhe && ` — ${data.riscoPendenciaDetalhe}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PrintSection>

        <PrintSection title="Software">
          <PrintLine label="Sistema" value={data.sistema.join(", ")} />
          <PrintLine label="Módulo Fiscal" value={data.moduloFiscal.join(", ")} />
        </PrintSection>

        <PrintSection title="Conversão de Dados">
          <PrintLine
            label="Conversão"
            value={data.conversao === "sim" ? "Sim" : data.conversao === "nao" ? "Não" : ""}
          />
        </PrintSection>

        <PrintSection title="Plano de Treinamento">
          <p>{data.planoTreinamento.length > 0 ? data.planoTreinamento.join(", ") : "—"}</p>
        </PrintSection>

        <PrintSection title="Módulos Complementares | Gerar Valor">
          <p>{data.modulosComplementares.length > 0 ? data.modulosComplementares.join(", ") : "—"}</p>
        </PrintSection>
      </div>
    </div>
  );
}
