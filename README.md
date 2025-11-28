# Fleet Manager

Sistema profissional de gestão de viagens, frota e equipe técnica.

![Stack](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-Ready-green) ![Cloudflare](https://img.shields.io/badge/Cloudflare-Deploy-orange)

## 🚀 Características

- ✅ **Dashboard** com estatísticas e gráficos em tempo real
- 📅 **Calendário Visual** para gestão de agendamentos
- 🚗 **Gestão de Frota** completa (CRUD de veículos)
- 👥 **Gestão de Equipe** com controle de férias
- 📊 **Validações Automáticas** (disponibilidade de veículo, férias de técnicos)
- 📁 **Importação de CSV** para migração de dados históricos
- 🎨 **Design Responsivo** e profissional
- 🔐 **Autenticação Segura** com Supabase

## 🛠️ Stack Tecnológica

- **Frontend:** React + Vite + TypeScript
- **Estilização:** Tailwind CSS + Shadcn/UI
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Gráficos:** Recharts
- **Calendário:** React Big Calendar
- **Deploy:** Cloudflare Pages

## 📋 Início Rápido

### 1. Clone o Repositório

```bash
git clone <URL_DO_SEU_REPO>
cd fleet-manager
```

### 2. Configure o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute o script `database.sql` no SQL Editor do Supabase
4. Copie sua URL e anon key das configurações de API

### 3. Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

### 4. Instale e Execute

```bash
npm install
npm run dev
```

Acesse `http://localhost:8080`

## 📖 Documentação Completa

Para instruções detalhadas de configuração, deploy e customização, consulte [SETUP.md](./SETUP.md)

## 🚢 Deploy

### Cloudflare Pages

1. Conecte seu repositório GitHub ao Cloudflare Pages
2. Configure:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Adicione as variáveis de ambiente do Supabase
4. Deploy automático a cada push!

Consulte o [SETUP.md](./SETUP.md) para instruções detalhadas.

## 📁 Estrutura do Projeto

```
fleet-manager/
├── src/
│   ├── components/      # Componentes React
│   ├── contexts/        # Context API (Auth)
│   ├── lib/            # Cliente Supabase
│   ├── pages/          # Páginas da aplicação
│   └── types/          # TypeScript types
├── public/            # Assets estáticos
├── database.sql       # Script do banco de dados
└── SETUP.md          # Guia completo de configuração
```

## 🎯 Funcionalidades Principais

### Dashboard
- Estatísticas de agendamentos, veículos e técnicos
- Gráficos de atendimentos por cidade e por técnico
- Cards informativos com dados em tempo real

### Calendário
- Visualização mensal/semanal/diária
- Código de cores por status do agendamento
- Detalhes completos ao clicar em um evento

### Gestão de Frota
- Cadastro de veículos (modelo, placa, status)
- Controle de disponibilidade
- Histórico de manutenções

### Gestão de Equipe
- Cadastro de técnicos (nome, setor, status)
- Controle de férias
- Validação automática de disponibilidade

### Agendamentos
- Formulário completo de criação
- Validações:
  - Veículo disponível no horário
  - Técnico não está de férias
- Associação com técnico e veículo

### Importação
- Upload de arquivos CSV
- Prévia antes da importação
- Mapeamento automático de colunas

## 🔒 Segurança

- ✅ Row Level Security (RLS) ativado em todas as tabelas
- ✅ Autenticação via Supabase Auth
- ✅ Variáveis de ambiente para credenciais
- ✅ Políticas de acesso configuráveis

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para:
- Reportar bugs
- Sugerir novas funcionalidades
- Melhorar a documentação
- Enviar pull requests

## 📝 Licença

Projeto Privado de uso exclusivo da Zaal Tecnologia.

---
