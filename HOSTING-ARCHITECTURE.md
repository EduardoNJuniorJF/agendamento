# Arquitetura de Hospedagem - Fleet Manager

## Visão Geral da Infraestrutura

Este documento descreve como o sistema Fleet Manager está hospedado atualmente, detalhando cada camada da aplicação.

---

## 1. Front-End (Interface do Usuário)

### Plataforma de Hospedagem
**Lovable / Cloudflare Pages**

### Detalhes Técnicos
- **Tecnologia**: React 18 + Vite + TypeScript
- **URL Atual**: `https://bf9a336d-4b48-4c09-b494-7941bf2c44b1.lovableproject.com`
- **CDN**: Cloudflare (distribuição global)
- **Build Tool**: Vite (configurado em `vite.config.ts`)
- **Deploy**: Automático via Lovable

### Características
- ✅ **HTTPS automático** com certificado SSL/TLS
- ✅ **CDN global** para carregamento rápido em qualquer lugar do mundo
- ✅ **Deploy contínuo** - atualizações instantâneas ao clicar em "Update"
- ✅ **Subdomínio gratuito** fornecido pelo Lovable
- ✅ **Possibilidade de domínio customizado** (ex: agendamento.seudominio.com.br)

### Arquivos Estáticos
- Servidos diretamente pelo Cloudflare Pages
- Assets otimizados automaticamente
- Compressão Brotli/Gzip habilitada

---

## 2. Back-End (Lógica de Servidor)

### Plataforma de Hospedagem
**Supabase Cloud**

### Detalhes Técnicos
- **Project ID**: `ljaelokwxmwbgvfbjqlf`
- **URL da API**: `https://ljaelokwxmwbgvfbjqlf.supabase.co`
- **Região**: Hospedado na infraestrutura da Supabase (AWS)
- **Tipo**: Backend-as-a-Service (BaaS)

### Componentes do Backend

#### 2.1 API REST
- **Endpoint Base**: `https://ljaelokwxmwbgvfbjqlf.supabase.co/rest/v1/`
- **Autenticação**: JWT (JSON Web Tokens)
- **Geração automática** de endpoints CRUD para todas as tabelas
- **Exemplos de endpoints ativos**:
  - `/rest/v1/appointments` - Gerenciamento de agendamentos
  - `/rest/v1/agents` - Gerenciamento de agentes
  - `/rest/v1/vehicles` - Gerenciamento de veículos
  - `/rest/v1/time_off` - Gerenciamento de férias/folgas

#### 2.2 Autenticação (Supabase Auth)
- **Sistema**: Supabase Authentication
- **Recursos disponíveis**:
  - Login/Registro com email e senha
  - Gerenciamento de sessões
  - Tokens JWT automáticos
  - Reset de senha
  - Confirmação de email

#### 2.3 Row Level Security (RLS)
- **Segurança**: Políticas de acesso no nível do banco de dados
- **Implementação**: Regras SQL que controlam quem pode acessar/modificar dados
- **Proteção**: Garante que usuários só acessem seus próprios dados

---

## 3. Banco de Dados

### Plataforma de Hospedagem
**Supabase Database (PostgreSQL)**

### Detalhes Técnicos
- **Engine**: PostgreSQL 15+
- **Hospedagem**: AWS (via Supabase)
- **Conexão**: Gerenciada automaticamente pelo Supabase Client
- **Backup**: Automático (gerenciado pelo Supabase)

### Estrutura de Dados
O banco possui as seguintes tabelas principais:

#### Tabelas Ativas
1. **`appointments`** - Agendamentos
   - Informações de compromissos
   - Relacionamento com veículos e agentes
   - Status e controle de despesas

2. **`agents`** - Agentes/Funcionários
   - Dados dos membros da equipe
   - Cores para identificação visual
   - Status ativo/inativo

3. **`vehicles`** - Frota de Veículos
   - Informações dos veículos
   - Modelo, placa, etc.

4. **`time_off`** - Férias e Folgas
   - Registros de ausências
   - Tipo (completa/parcial)
   - Status de aprovação

5. **`appointment_agents`** - Relação Muitos-para-Muitos
   - Liga múltiplos agentes a um agendamento
   - Permite equipes em compromissos

### Características do Banco
- ✅ **Realtime subscriptions** habilitadas
- ✅ **Row Level Security (RLS)** configurado
- ✅ **Triggers e functions** para automações
- ✅ **Backup automático** diário
- ✅ **API REST gerada automaticamente**

---

## 4. Fluxo de Dados Completo

```
┌─────────────────┐
│   USUÁRIO       │
│   (Navegador)   │
└────────┬────────┘
         │
         │ HTTPS
         ↓
┌─────────────────────────────────────┐
│   FRONT-END                         │
│   Lovable/Cloudflare Pages          │
│   • React + Vite                    │
│   • Tailwind CSS                    │
│   • React Router                    │
└────────┬────────────────────────────┘
         │
         │ API Calls (REST)
         │ + JWT Authentication
         ↓
┌─────────────────────────────────────┐
│   BACK-END                          │
│   Supabase Cloud                    │
│   • API REST Automática             │
│   • Authentication                  │
│   • Row Level Security              │
└────────┬────────────────────────────┘
         │
         │ SQL Queries
         ↓
┌─────────────────────────────────────┐
│   BANCO DE DADOS                    │
│   PostgreSQL (Supabase)             │
│   • Tabelas estruturadas            │
│   • Triggers e Functions            │
│   • Backup automático               │
└─────────────────────────────────────┘
```

---

## 5. Variáveis de Ambiente

### Configuração Atual (arquivo `.env`)
```env
VITE_SUPABASE_PROJECT_ID="ljaelokwxmwbgvfbjqlf"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://ljaelokwxmwbgvfbjqlf.supabase.co"
```

### Onde Estão Configuradas
- **Desenvolvimento local**: arquivo `.env`
- **Produção (Lovable)**: Configuradas no painel do Lovable (Settings → Environment Variables)

---

## 6. Custos e Planos

### Front-End (Lovable/Cloudflare)
- **Plano atual**: Lovable (verificar seu plano específico)
- **Domínio customizado**: Disponível em planos pagos

### Back-End + Database (Supabase)
- **Plano atual**: Free Tier ou Pro (verificar no dashboard do Supabase)
- **Limites Free Tier**:
  - 500 MB de armazenamento
  - 2 GB de transferência
  - 50.000 usuários ativos mensais
  - API automática ilimitada
  - Autenticação incluída

---

## 7. Como Fazer Deploy de Atualizações

### Front-End
1. Fazer alterações no código via Lovable
2. Testar no ambiente de preview
3. Clicar em **"Publish"** → **"Update"**
4. Deploy automático para produção (1-2 minutos)

### Back-End (Supabase)
- **Mudanças no schema do banco**: Executar SQL no Supabase Dashboard
- **Atualizações de RLS policies**: Executar SQL no Supabase Dashboard
- **Não requer deploy** - mudanças são instantâneas

---

## 8. Monitoramento e Logs

### Front-End
- **Logs**: Console do navegador
- **Erros**: Lovable pode capturar erros de runtime
- **Performance**: Cloudflare Analytics

### Back-End/Database
- **Dashboard**: https://supabase.com/dashboard/project/ljaelokwxmwbgvfbjqlf
- **Logs de API**: Tempo real no Supabase Dashboard
- **Logs de Database**: Query performance e logs
- **Auth logs**: Tentativas de login, registros

---

## 9. Segurança

### Camadas de Segurança Implementadas

#### Front-End
- ✅ HTTPS obrigatório (certificado SSL/TLS)
- ✅ Content Security Policy via Cloudflare
- ✅ Proteção DDoS via Cloudflare

#### Back-End
- ✅ Autenticação JWT
- ✅ Row Level Security (RLS) nas tabelas
- ✅ API keys separadas (publishable key pública + service key privada)
- ✅ Rate limiting automático

#### Banco de Dados
- ✅ Conexões criptografadas
- ✅ RLS policies por tabela
- ✅ Backup automático diário
- ✅ Point-in-time recovery (em planos Pro)

---

## 10. Próximos Passos Sugeridos

### Para Produção Profissional
1. **Domínio Customizado**
   - Configurar `agendamento.seudominio.com.br`
   - Manter site principal na Hostgator

2. **Monitoramento Avançado**
   - Configurar alertas de erro
   - Adicionar analytics mais detalhado
   - Implementar logging estruturado

3. **Backup e Recuperação**
   - Documentar processo de backup manual
   - Testar recuperação de desastres
   - Considerar upgrade para Supabase Pro (backups mais frequentes)

4. **Performance**
   - Implementar caching de queries
   - Otimizar imagens
   - Adicionar lazy loading

5. **Segurança Adicional**
   - Implementar 2FA (Two-Factor Authentication)
   - Adicionar captcha em formulários públicos
   - Revisar e reforçar RLS policies

---

## 11. Contatos e Suporte

### Supabase
- **Dashboard**: https://supabase.com/dashboard
- **Documentação**: https://supabase.com/docs
- **Suporte**: Via Discord ou email (planos Pro+)

### Lovable
- **Dashboard**: https://lovable.dev
- **Documentação**: https://docs.lovable.dev
- **Suporte**: Via chat no app

### Cloudflare (quando configurar domínio)
- **Dashboard**: https://dash.cloudflare.com
- **Documentação**: https://developers.cloudflare.com

---

## Resumo Executivo

| Componente | Hospedagem | Tecnologia | Status |
|------------|------------|------------|--------|
| **Front-End** | Lovable/Cloudflare Pages | React + Vite | ✅ Ativo |
| **Back-End** | Supabase Cloud | API REST + Auth | ✅ Ativo |
| **Banco de Dados** | Supabase (AWS) | PostgreSQL 15+ | ✅ Ativo |
| **CDN** | Cloudflare | Global | ✅ Ativo |
| **SSL/TLS** | Automático | Let's Encrypt | ✅ Ativo |

**Última atualização**: 26/11/2025
