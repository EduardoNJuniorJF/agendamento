import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useToast } from "@/hooks/use-toast";
import { Save, Printer, Plus, Trash2, HelpCircle, Search, X, GripVertical } from "lucide-react";
import logo from "@/assets/logo-bonus-report.png";

interface ImplantationClient {
  id: string;
  code: string | null;
  name: string;
  group_name: string | null;
  profile: string | null;
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
  onSaved: (savedProject?: ImplantationProject) => void;
  isNew?: boolean;
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
const SERVIDOR_OPTIONS = ["Nuvem Zaal", "Nuvem Cliente", "Servidor Local", "Sem conexão"];
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

// Staged training items when conversion = NO
const ETAPAS_SEM_CONVERSAO: { label: string; items: Array<{ text: string; header?: boolean }> }[] = [
  {
    label: "Primeira Etapa",
    items: [
      { text: "Incluir e clonar" },
      { text: "Emissão de Etiquetas - Modelo do cliente:" },
      { text: "Consulta" },
      { text: "Alteração e reajuste" },
    ],
  },
  {
    label: "Segunda Etapa",
    items: [
      { text: "Exportar Produtos Balança e/ou Busca Preço" },
      { text: "Quiosque" },
      { text: "Operações de Vendas" },
      { text: "Cadastro de pessoas" },
      { text: "Emissão de NFCE." },
      { text: "Configuração de Plano de Contas (simples)" },
      { text: "Despesas de caixa" },
      { text: "Consulta de vendas e exclusão" },
      { text: "Fechamento de caixa" },
      { text: "Permissões de acesso [Alinhar com Proprietário]" },
      {
        text: "Relatório de Resumo de Vendas, Ranking, Saída montado, Movimentação e demais relatórios que o cliente solicitar.",
      },
      { text: "Backup" },
    ],
  },
  {
    label: "Terceira Etapa",
    items: [
      { text: "Importação de XML e entrada manual (usará para cadastrar produtos novos e reposição)" },
      { text: "Esclarecimento de dúvidas" },
      { text: "Balanço" },
      { text: "App de Resultados" },
      { text: "Plataforma do Contador" },
      { text: "Cash Back" },
      { text: "Contas a Pagar" },
    ],
  },
];

// Staged training items when conversion = YES
const ETAPAS_COM_CONVERSAO: { label: string; items: Array<{ text: string; header?: boolean }> }[] = [
  {
    label: "Primeira Etapa",
    items: [
      { text: "Estoque", header: true },
      { text: "Incluir e clonar" },
      { text: "Emissão de Etiquetas - Modelo do cliente:" },
      { text: "Consulta" },
      { text: "Alteração e reajuste" },
      { text: "Exportar Produtos Balança e/ou Busca Preço" },
      { text: "Vendas", header: true },
      { text: "Quiosque" },
      { text: "Operações de Vendas" },
      { text: "Cadastro de pessoas" },
      { text: "Emissão de NFCE." },
      { text: "Configuração de Plano de Contas (simples)" },
      { text: "Despesas de caixa" },
      { text: "Consulta de vendas e exclusão" },
      { text: "Fechamento de caixa" },
      { text: "Permissões de acesso [Alinhar com Proprietário]" },
      {
        text: "Relatório de Resumo de Vendas, Ranking, Saída montado, Movimentação e demais relatórios que o cliente solicitar.",
      },
      { text: "Backup" },
    ],
  },
  {
    label: "Segunda Etapa",
    items: [
      { text: "Dúvidas e reciclagem" },
      { text: "Importação de XML e entrada manual (usará para cadastrar produtos novos e reposição)" },
    ],
  },
  {
    label: "Terceira Etapa",
    items: [
      { text: "Esclarecimento de dúvidas" },
      { text: "Balanço" },
      { text: "App de Resultados" },
      { text: "Plataforma do Contador" },
      { text: "Cash Back" },
      { text: "Contas a Pagar" },
    ],
  },
];
const MODULOS_OPTIONS: string[] = [];

const FERRAMENTAS_AVANCADAS_ITEMS = [
  "Caixa central e Contas Bancárias",
  "BI",
  "Plugtoo ou Tray Commerce",
  "CRM",
  "Meta",
  "Coletor Zaal",
];

const DEFAULT_CRONOGRAMA = [
  { item: "Primeiro Atendimento", data: "" },
  { item: "Segundo Atendimento", data: "" },
  { item: "Terceiro Atendimento", data: "" },
];

interface EtapaDisplayItem {
  text: string;
  header?: boolean;
}

interface EtapaData {
  items: string[];
  displayItems?: EtapaDisplayItem[];
  data: string;
  dataFim?: string;
}

interface ProjectData {
  numLojas: string;
  isGrupo: string;
  grupoNome: string;
  agentesResponsaveis: string[];
  regimeTributario: string[];
  porte: string[];
  estrutura: Array<{ item: string; quantidade: number }>;
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
  ferramentasAvancadas: {
    bi: { enabled: boolean; gerarConta: boolean; instalacao: boolean; treinamentoData: string };
    selectedItems: string[];
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
  agentesResponsaveis: [],
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
  ferramentasAvancadas: {
    bi: { enabled: false, gerarConta: false, instalacao: false, treinamentoData: "" },
    selectedItems: [],
  },
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
        c.group_name?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  if (selectedClient) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
        <div className="flex-1">
          <p className="text-sm font-medium">Código do cliente: {selectedClient.code || "N/A"}</p>
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
// Sortable item component for drag-and-drop
function SortableEtapaItem({
  id,
  text,
  checked,
  onCheckedChange,
}: {
  id: string;
  text: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 text-sm rounded-md px-1 py-0.5 hover:bg-muted/50 group"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        <span>{text}</span>
      </label>
    </div>
  );
}

// Droppable container for each etapa
function DroppableEtapa({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useSortable({
    id,
    data: { type: "container" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-md p-4 transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border"}`}
    >
      {children}
    </div>
  );
}

export default function ProjectForm({ project, clients, onSaved, isNew = false }: ProjectFormProps) {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState(project.name);
  const [clientId, setClientId] = useState<string | null>(project.client_id);
  const [responsavel, setResponsavel] = useState<string>(() => {
    const client = clients.find((c) => c.id === project.client_id);
    return client?.profile || "";
  });
  const [profile, setProfile] = useState<string>(project.profile || "");
  const [data, setData] = useState<ProjectData>(() => {
    const saved = project.project_data;
    if (saved && Object.keys(saved).length > 0) {
      const merged = { ...DEFAULT_DATA, ...saved };
      // Migrate old string[] estrutura to new format
      if (Array.isArray(merged.estrutura) && merged.estrutura.length > 0 && typeof merged.estrutura[0] === "string") {
        merged.estrutura = (merged.estrutura as unknown as string[]).map((item: string) => ({ item, quantidade: 1 }));
      }
      return merged;
    }
    return { ...DEFAULT_DATA };
  });
  const [saving, setSaving] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [savedProjectRef, setSavedProjectRef] = useState<ImplantationProject | null>(null);

  // Fetch agents
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase
      .from("agents")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data: agentsData }) => {
        if (agentsData) setAgents(agentsData);
      });
  }, []);

  const selectedClient = clients.find((c) => c.id === clientId);

  // Auto-fill from client when client changes
  useEffect(() => {
    if (selectedClient) {
      setProjectName(selectedClient.name);
      setResponsavel(selectedClient.profile || "");
      if (selectedClient.group_name) {
        setData((prev) => ({
          ...prev,
          isGrupo: "sim",
          grupoNome: prev.grupoNome || selectedClient.group_name || "",
        }));
      }
    }
  }, [clientId]);

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
    const payload = {
      name: projectName.trim() || "Sem nome",
      client_id: clientId,
      profile: profile || null,
      project_data: JSON.parse(JSON.stringify(data)),
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { data: inserted, error } = await supabase
        .from("implantation_projects" as any)
        .insert({ ...payload, id: project.id } as any)
        .select()
        .single();

      if (error) {
        toast({ title: "Erro ao criar projeto", variant: "destructive" });
      } else {
        toast({ title: "Projeto criado e salvo!" });
        onSaved(inserted as unknown as ImplantationProject);
      }
    } else {
      const { error } = await supabase
        .from("implantation_projects" as any)
        .update(payload as any)
        .eq("id", project.id);

      if (error) {
        toast({ title: "Erro ao salvar projeto", variant: "destructive" });
      } else {
        toast({ title: "Projeto salvo com sucesso!" });
        onSaved();
      }
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

  const toggleEtapaItem = (etapaKey: "etapa1" | "etapa2" | "etapa3", item: string) => {
    const etapas = { ...data.treinamentoEtapas };
    const etapa = { ...etapas[etapaKey] };
    if (etapa.items.includes(item)) {
      etapa.items = etapa.items.filter((v) => v !== item);
    } else {
      etapa.items = [...etapa.items, item];
    }
    etapas[etapaKey] = etapa;
    updateField("treinamentoEtapas", etapas);
  };

  const updateEtapaDate = (etapaKey: "etapa1" | "etapa2" | "etapa3", field: "data" | "dataFim", value: string) => {
    const etapas = { ...data.treinamentoEtapas };
    etapas[etapaKey] = { ...etapas[etapaKey], [field]: value };
    updateField("treinamentoEtapas", etapas);
  };

  const currentEtapas = data.conversao === "sim" ? ETAPAS_COM_CONVERSAO : ETAPAS_SEM_CONVERSAO;
  const etapaKeys: Array<"etapa1" | "etapa2" | "etapa3"> = ["etapa1", "etapa2", "etapa3"];

  // Merge saved displayItems with template to include any newly added items
  // All valid item texts across all etapas for current conversion mode
  const allValidTexts = useMemo(() => {
    const texts = new Set<string>();
    currentEtapas.forEach((etapa) => etapa.items.forEach((item) => texts.add(item.text)));
    return texts;
  }, [currentEtapas]);

  // Merge saved displayItems with template: add missing, remove obsolete
  const mergeDisplayItems = useCallback(
    (saved: Array<{ text: string; header?: boolean }>, template: Array<{ text: string; header?: boolean }>) => {
      // Remove items no longer in any template etapa
      const filtered = saved.filter((s) => allValidTexts.has(s.text));
      // Add missing items from this etapa's template
      const savedTexts = new Set(filtered.map((s) => s.text));
      const missing = template.filter((t) => !savedTexts.has(t.text));
      const result = missing.length > 0 ? [...filtered, ...missing] : filtered;
      return result;
    },
    [allValidTexts],
  );

  // Build the display items per etapa: use saved displayItems or fall back to template
  const getEtapaDisplayItems = useCallback(
    (etapaKey: "etapa1" | "etapa2" | "etapa3", idx: number) => {
      const etapaData = data.treinamentoEtapas?.[etapaKey];
      const templateItems = currentEtapas[idx]?.items || [];
      if (etapaData?.displayItems && etapaData.displayItems.length > 0) {
        return mergeDisplayItems(etapaData.displayItems, templateItems);
      }
      return templateItems;
    },
    [data.treinamentoEtapas, currentEtapas, mergeDisplayItems],
  );

  // Initialize/update displayItems when conversao changes or template changes
  useEffect(() => {
    if (!data.conversao) return;
    const etapas = { ...data.treinamentoEtapas };
    let changed = false;
    etapaKeys.forEach((key, idx) => {
      const templateItems = currentEtapas[idx]?.items || [];
      if (!etapas[key]?.displayItems || etapas[key].displayItems!.length === 0) {
        etapas[key] = { ...etapas[key], displayItems: [...templateItems] };
        changed = true;
      } else {
        const merged = mergeDisplayItems(etapas[key].displayItems!, templateItems);
        if (merged.length !== etapas[key].displayItems!.length) {
          etapas[key] = { ...etapas[key], displayItems: merged };
          changed = true;
        }
      }
    });
    if (changed) {
      updateField("treinamentoEtapas", etapas);
    }
  }, [data.conversao]);

  // DnD state
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findEtapaByItemId = (itemId: string): "etapa1" | "etapa2" | "etapa3" | null => {
    for (const key of etapaKeys) {
      const displayItems = data.treinamentoEtapas?.[key]?.displayItems || [];
      if (displayItems.some((di) => `${key}-${di.text}` === itemId)) return key;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItemId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceEtapa = findEtapaByItemId(activeId);
    // over can be an item or a droppable container (etapa key)
    let targetEtapa = findEtapaByItemId(overId);
    if (!targetEtapa && etapaKeys.includes(overId as any)) {
      targetEtapa = overId as "etapa1" | "etapa2" | "etapa3";
    }

    if (!sourceEtapa || !targetEtapa || sourceEtapa === targetEtapa) return;

    // Move item from source to target
    const etapas = { ...data.treinamentoEtapas };
    const sourceItems = [...(etapas[sourceEtapa].displayItems || [])];
    const targetItems = [...(etapas[targetEtapa].displayItems || [])];

    const itemText = activeId.replace(`${sourceEtapa}-`, "");
    const itemIndex = sourceItems.findIndex((di) => di.text === itemText);
    if (itemIndex === -1) return;

    const [movedItem] = sourceItems.splice(itemIndex, 1);

    // Find position in target
    const overItemText = overId.replace(`${targetEtapa}-`, "");
    const overIndex = targetItems.findIndex((di) => di.text === overItemText);
    if (overIndex >= 0) {
      targetItems.splice(overIndex, 0, movedItem);
    } else {
      targetItems.push(movedItem);
    }

    etapas[sourceEtapa] = { ...etapas[sourceEtapa], displayItems: sourceItems };
    etapas[targetEtapa] = { ...etapas[targetEtapa], displayItems: targetItems };

    // Also move checked status
    if (etapas[sourceEtapa].items.includes(movedItem.text)) {
      etapas[sourceEtapa] = {
        ...etapas[sourceEtapa],
        items: etapas[sourceEtapa].items.filter((i) => i !== movedItem.text),
      };
      if (!etapas[targetEtapa].items.includes(movedItem.text)) {
        etapas[targetEtapa] = {
          ...etapas[targetEtapa],
          items: [...etapas[targetEtapa].items, movedItem.text],
        };
      }
    }

    updateField("treinamentoEtapas", etapas);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItemId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceEtapa = findEtapaByItemId(activeId);
    let targetEtapa = findEtapaByItemId(overId);
    if (!targetEtapa && etapaKeys.includes(overId as any)) {
      targetEtapa = overId as "etapa1" | "etapa2" | "etapa3";
    }

    if (!sourceEtapa || !targetEtapa) return;

    // Reorder within same etapa
    if (sourceEtapa === targetEtapa) {
      const etapas = { ...data.treinamentoEtapas };
      const items = [...(etapas[sourceEtapa].displayItems || [])];
      const activeText = activeId.replace(`${sourceEtapa}-`, "");
      const overText = overId.replace(`${targetEtapa}-`, "");
      const oldIndex = items.findIndex((di) => di.text === activeText);
      const newIndex = items.findIndex((di) => di.text === overText);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        etapas[sourceEtapa] = {
          ...etapas[sourceEtapa],
          displayItems: arrayMove(items, oldIndex, newIndex),
        };
        updateField("treinamentoEtapas", etapas);
      }
    }
  };

  const activeItemText = activeItemId ? activeItemId.replace(/^etapa\d-/, "") : null;

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
            {(data.agentesResponsaveis || []).length > 0 && (
              <p className="text-sm">
                Responsável:{" "}
                <strong>
                  {(data.agentesResponsaveis || [])
                    .map((id) => agents.find((a) => a.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </strong>
              </p>
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
              <Label>Cliente Associado</Label>
              <div className="mt-1">
                <ClientSearch clients={clients} selectedClientId={clientId} onSelect={setClientId} />
              </div>
            </div>
            <div>
              <Label>Nome do Projeto *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
            <div>
              <Label>Nome do Responsável</Label>
              <Input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Responsável pela loja"
              />
            </div>
            <div>
              <Label>Agente(s) Responsável(is)</Label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {agents.map((agent) => (
                  <label key={agent.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={(data.agentesResponsaveis || []).includes(agent.id)}
                      onCheckedChange={() => {
                        const current = data.agentesResponsaveis || [];
                        if (current.includes(agent.id)) {
                          updateField(
                            "agentesResponsaveis",
                            current.filter((id) => id !== agent.id),
                          );
                        } else {
                          updateField("agentesResponsaveis", [...current, agent.id]);
                        }
                      }}
                    />
                    <span>{agent.name}</span>
                  </label>
                ))}
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porte</Label>
              <Select value={data.porte[0] || ""} onValueChange={(v) => updateField("porte", [v])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PORTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estrutura</Label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2 items-end">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!data.estrutura.some((e) => e.item === value)) {
                        updateField("estrutura", [...data.estrutura, { item: value, quantidade: 1 }]);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTRUTURA_OPTIONS.filter((opt) => !data.estrutura.some((e) => e.item === opt)).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {data.estrutura.map((est, idx) => (
                  <div key={est.item} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <span className="flex-1 text-sm">{est.item}</span>
                    <Label className="text-xs text-muted-foreground">Qtd:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={est.quantidade}
                      onChange={(e) => {
                        const updated = [...data.estrutura];
                        updated[idx] = { ...updated[idx], quantidade: Number(e.target.value) || 1 };
                        updateField("estrutura", updated);
                      }}
                      className="w-20 h-8"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateField(
                          "estrutura",
                          data.estrutura.filter((_, i) => i !== idx),
                        )
                      }
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
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
              <Select value={data.servidor[0] || ""} onValueChange={(v) => updateField("servidor", [v])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVIDOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base de Dados</Label>
              <Select value={data.baseDados[0] || ""} onValueChange={(v) => updateField("baseDados", [v])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {BASE_DADOS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
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
                <Label>Funções</Label>
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
              <Select value={data.sistema[0] || ""} onValueChange={(v) => updateField("sistema", [v])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SISTEMA_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
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

        {/* 9-11. Training sections with drag and drop */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plano de Treinamento | Rotinas Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!data.conversao && (
              <p className="text-sm text-muted-foreground italic">
                Selecione Sim ou Não no campo Conversão para exibir as etapas do treinamento.
              </p>
            )}
            {data.conversao && (
              <>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <GripVertical className="h-3 w-3" /> Arraste os itens entre as etapas para reorganizar.
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  {currentEtapas.map((etapa, idx) => {
                    const etapaKey = etapaKeys[idx];
                    const etapaData = data.treinamentoEtapas?.[etapaKey] || {
                      items: [],
                      data: "",
                      dataFim: "",
                      displayItems: [],
                    };
                    const displayItems = etapaData.displayItems || etapa.items;
                    const showDateRange = data.conversao === "sim" && idx === 0;
                    const sortableIds = displayItems.filter((di) => !di.header).map((di) => `${etapaKey}-${di.text}`);

                    return (
                      <DroppableEtapa key={etapaKey} id={etapaKey}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <h4 className="font-semibold text-sm">{etapa.label}</h4>
                          <div className="flex items-center gap-2">
                            {showDateRange ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs whitespace-nowrap">Início:</Label>
                                  <Input
                                    type="date"
                                    value={etapaData.data}
                                    onChange={(e) => updateEtapaDate(etapaKey, "data", e.target.value)}
                                    className="w-[150px] h-8 text-xs"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs whitespace-nowrap">Fim:</Label>
                                  <Input
                                    type="date"
                                    value={etapaData.dataFim || ""}
                                    onChange={(e) => updateEtapaDate(etapaKey, "dataFim", e.target.value)}
                                    className="w-[150px] h-8 text-xs"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Label className="text-xs whitespace-nowrap">Data:</Label>
                                <Input
                                  type="date"
                                  value={etapaData.data}
                                  onChange={(e) => updateEtapaDate(etapaKey, "data", e.target.value)}
                                  className="w-[150px] h-8 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1">
                            {displayItems.map((item) =>
                              item.header ? (
                                <p key={`header-${item.text}`} className="font-semibold text-xs text-primary mt-3 mb-1">
                                  {item.text}
                                </p>
                              ) : (
                                <SortableEtapaItem
                                  key={`${etapaKey}-${item.text}`}
                                  id={`${etapaKey}-${item.text}`}
                                  text={item.text}
                                  checked={etapaData.items.includes(item.text)}
                                  onCheckedChange={() => toggleEtapaItem(etapaKey, item.text)}
                                />
                              ),
                            )}
                            {displayItems.filter((di) => !di.header).length === 0 && (
                              <p className="text-xs text-muted-foreground italic py-2">Arraste itens para esta etapa</p>
                            )}
                          </div>
                        </SortableContext>
                      </DroppableEtapa>
                    );
                  })}
                  <DragOverlay>
                    {activeItemText ? (
                      <div className="flex items-center gap-2 text-sm bg-background border border-primary/50 rounded-md px-3 py-2 shadow-lg">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{activeItemText}</span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            )}
            {/* Módulos Complementares | Rotinas Avançadas - inside training card */}
            {data.conversao && (
              <>
                <Separator />
                <div className="border border-border rounded-md p-4 space-y-4">
                  <h4 className="font-semibold text-sm">Módulos Complementares | Rotinas Avançadas</h4>
                  <p className="text-sm text-muted-foreground">
                    Chegando nesse ponto significa que as rotinas básicas da implantação foram concluídas com sucesso. A
                    partir de agora, os atendimentos serão isolados, com o mesmo compromisso, mas focados em rotinas
                    avançadas, que cancelam cronogramas separados conforme a ferramenta. Para implementar essas rotinas,
                    será necessário abrir novos protocolos usando as ferramentas abaixo. Analisar a possibilidade de
                    agendar mais de um processo para o mesmo dia.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={data.ferramentasAvancadas?.bi?.enabled || false}
                        onCheckedChange={(checked) => {
                          const fa = { ...data.ferramentasAvancadas };
                          fa.bi = { ...fa.bi, enabled: !!checked };
                          updateField("ferramentasAvancadas", fa);
                        }}
                      />
                      <span>BI</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={data.ferramentasAvancadas?.bi?.gerarConta || false}
                        onCheckedChange={(checked) => {
                          const fa = { ...data.ferramentasAvancadas };
                          fa.bi = { ...fa.bi, gerarConta: !!checked };
                          updateField("ferramentasAvancadas", fa);
                        }}
                      />
                      <span>Gerar Conta (Mauro)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={data.ferramentasAvancadas?.bi?.instalacao || false}
                        onCheckedChange={(checked) => {
                          const fa = { ...data.ferramentasAvancadas };
                          fa.bi = { ...fa.bi, instalacao: !!checked };
                          updateField("ferramentasAvancadas", fa);
                        }}
                      />
                      <span>Instalação e configurações</span>
                    </label>
                    {FERRAMENTAS_AVANCADAS_ITEMS.map((item) => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={(data.ferramentasAvancadas?.selectedItems || []).includes(item)}
                          onCheckedChange={(checked) => {
                            const fa = { ...data.ferramentasAvancadas };
                            const current = fa.selectedItems || [];
                            fa.selectedItems = checked ? [...current, item] : current.filter((i) => i !== item);
                            updateField("ferramentasAvancadas", fa);
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Label className="text-sm whitespace-nowrap">Treinamento agendado para:</Label>
                    <Input
                      type="date"
                      value={data.ferramentasAvancadas?.bi?.treinamentoData || ""}
                      onChange={(e) => {
                        const fa = { ...data.ferramentasAvancadas };
                        fa.bi = { ...fa.bi, treinamentoData: e.target.value };
                        updateField("ferramentasAvancadas", fa);
                      }}
                      className="w-[180px] h-8 text-sm"
                    />
                  </div>
                </div>
              </>
            )}
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
          <PrintLine label="Estrutura" value={data.estrutura.map((e) => `${e.item} (${e.quantidade})`).join(", ")} />
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
              <span className="font-semibold">Funções:</span>
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
          {data.conversao === "sim" && (
            <p className="text-sm font-semibold mt-1">Prazo para conversão de até 20 dias</p>
          )}
        </PrintSection>

        <PrintSection title="Plano de Treinamento | Rotinas Básicas">
          {data.conversao ? (
            <>
              {etapaKeys.map((etapaKey, idx) => {
                const etapaData = data.treinamentoEtapas?.[etapaKey] || {
                  items: [],
                  data: "",
                  dataFim: "",
                  displayItems: [],
                };
                const displayItems =
                  etapaData.displayItems && etapaData.displayItems.length > 0
                    ? etapaData.displayItems
                    : currentEtapas[idx]?.items || [];
                const showDateRange = data.conversao === "sim" && idx === 0;
                const formatDate = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");
                const etapaLabel = currentEtapas[idx]?.label || `Etapa ${idx + 1}`;
                return (
                  <div key={etapaKey} className="mb-2">
                    <p className="font-semibold">
                      {etapaLabel}
                      {showDateRange
                        ? ` — ${formatDate(etapaData.data)} a ${formatDate(etapaData.dataFim || "")}`
                        : ` — ${formatDate(etapaData.data)}`}
                    </p>
                    {(() => {
                      const checkedItems = displayItems.filter((di) => !di.header && etapaData.items.includes(di.text));
                      return checkedItems.length > 0 ? (
                        <ul className="list-disc ml-6">
                          {checkedItems.map((item, i) => (
                            <li key={i}>{item.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ml-4 text-muted-foreground">Nenhum item marcado</p>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Novas Ferramentas inside training print */}
              <div className="mt-3 pt-2 border-t border-gray-300">
                <p className="font-semibold mb-1">Novas Ferramentas | Rotinas Avançadas</p>
                <ul className="list-disc ml-6">
                  {data.ferramentasAvancadas?.bi?.enabled && <li>BI ✓</li>}
                  {data.ferramentasAvancadas?.bi?.gerarConta && <li>Gerar Conta (Mauro) ✓</li>}
                  {data.ferramentasAvancadas?.bi?.instalacao && <li>Instalação e configurações ✓</li>}
                  <li>
                    Treinamento agendado para:{" "}
                    {data.ferramentasAvancadas?.bi?.treinamentoData
                      ? new Date(data.ferramentasAvancadas.bi.treinamentoData + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </li>
                  {(data.ferramentasAvancadas?.selectedItems || []).map((item) => (
                    <li key={item}>{item} ✓</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>—</p>
          )}
        </PrintSection>
      </div>
    </div>
  );
}
