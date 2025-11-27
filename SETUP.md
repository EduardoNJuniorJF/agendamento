# Fleet Manager - Guia de Configuração

Sistema profissional de gestão de viagens, frota e equipe técnica.

## 📋 Pré-requisitos

- Node.js 16+ e npm instalados
- Uma conta no Supabase (gratuita)
- Git para controle de versão

## 🚀 Configuração Inicial

### 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma nova conta (se ainda não tiver)
2. Crie um novo projeto
3. Aguarde a criação do banco de dados (leva ~2 minutos)
4. Vá até **SQL Editor** no painel lateral
5. Copie e cole o script SQL completo fornecido no arquivo `database.sql` (ou veja abaixo)
6. Execute o script clicando em **Run**

### 2. Obter Credenciais do Supabase

1. No painel do seu projeto, vá até **Project Settings** (ícone de engrenagem)
2. Clique em **API** no menu lateral
3. Copie as seguintes informações:
   - **Project URL** (algo como `https://xxx.supabase.co`)
   - **anon/public key** (chave pública, pode ser exposta no frontend)

### 3. Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo `.env` (copie do `.env.example`)
2. Preencha com suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

**IMPORTANTE:** Adicione `.env` ao seu `.gitignore` para não commitar credenciais!

### 4. Instalar Dependências

```bash
npm install
```

### 5. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`

## 👤 Primeiro Acesso

1. Acesse a aplicação
2. Clique em "Criar conta"
3. Preencha o formulário com seu email e senha
4. Verifique seu email e confirme a conta
5. Faça login com suas credenciais

**Dica:** O primeiro usuário pode ser promovido a admin manualmente no Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

## 📁 Estrutura do Projeto

```
fleet-manager/
├── src/
│   ├── components/       # Componentes React reutilizáveis
│   │   ├── ui/          # Componentes Shadcn/UI
│   │   ├── AppSidebar.tsx
│   │   └── Layout.tsx
│   ├── contexts/        # Contextos React (Auth)
│   ├── hooks/           # Custom hooks
│   ├── lib/            # Utilitários e configurações
│   │   └── supabase.ts # Cliente Supabase
│   ├── pages/          # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── CalendarView.tsx
│   │   ├── Fleet.tsx
│   │   ├── Team.tsx
│   │   ├── Import.tsx
│   │   └── NewAppointment.tsx
│   └── types/          # TypeScript types
└── public/            # Arquivos estáticos
```

## 🗄️ Script SQL do Banco de Dados

Copie e execute este script no **SQL Editor** do seu Supabase:

```sql
-- [Cole aqui o conteúdo completo do arquivo database.sql]
```

## 🚢 Deploy no Cloudflare Pages

### Passo 1: Preparar o Repositório

1. Crie um repositório no GitHub
2. Faça commit e push do código:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/fleet-manager.git
git push -u origin main
```

### Passo 2: Conectar ao Cloudflare Pages

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vá até **Workers & Pages**
3. Clique em **Create Application** > **Pages** > **Connect to Git**
4. Selecione seu repositório
5. Configure o build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** (deixe em branco)

### Passo 3: Adicionar Variáveis de Ambiente

No Cloudflare Pages, vá até **Settings** > **Environment variables** e adicione:

- `VITE_SUPABASE_URL` = sua URL do Supabase
- `VITE_SUPABASE_ANON_KEY` = sua chave pública

Marque ambas para **Production** e **Preview**.

### Passo 4: Deploy

Clique em **Save and Deploy**. Cada push para o repositório irá automaticamente:
- Fazer build da aplicação
- Fazer deploy para produção
- Gerar uma URL pública (ex: `fleet-manager.pages.dev`)

## 🔒 Segurança

- ✅ As credenciais do Supabase estão em variáveis de ambiente
- ✅ A `anon key` pode ser exposta no frontend (é segura para isso)
- ✅ Row Level Security (RLS) está ativado em todas as tabelas
- ✅ As políticas RLS são permissivas por padrão (ajuste conforme necessário)

### Reforçar Segurança (Opcional)

Para ambientes de produção, considere atualizar as políticas RLS para serem mais restritivas:

```sql
-- Exemplo: Apenas admins podem deletar veículos
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON vehicles;

CREATE POLICY "Only admins can delete vehicles" ON vehicles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## 📊 Funcionalidades

### ✅ Implementadas

- [x] Autenticação com email/senha
- [x] Dashboard com estatísticas e gráficos
- [x] Calendário visual de agendamentos
- [x] CRUD completo de Veículos
- [x] CRUD completo de Técnicos
- [x] Gestão de Férias
- [x] Criação de Agendamentos com validações
- [x] Importação de CSV
- [x] Design responsivo
- [x] Sidebar navegável

### 🔄 Validações Automáticas

- Impede agendar veículo já ocupado no mesmo horário
- Impede agendar técnico que está de férias
- Valida formato de datas e horários
- Valida placas de veículos

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Shadcn/UI
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Gráficos:** Recharts
- **Calendário:** React Big Calendar
- **Deploy:** Cloudflare Pages

## 📝 Customização

### Alterar Tema de Cores

Edite `src/index.css` e modifique as variáveis CSS:

```css
:root {
  --primary: 215 85% 45%;    /* Azul principal */
  --accent: 160 70% 45%;     /* Verde de destaque */
  /* ... outras cores */
}
```

### Adicionar Novos Campos

1. Adicione a coluna no Supabase via SQL Editor
2. Atualize os tipos em `src/types/database.ts`
3. Adicione o campo nos formulários correspondentes

## 🐛 Troubleshooting

### Erro: "Missing Supabase environment variables"

- Verifique se criou o arquivo `.env`
- Confirme que as variáveis começam com `VITE_`
- Reinicie o servidor de desenvolvimento

### Erro de autenticação no Supabase

- Confirme que executou o script SQL completo
- Verifique se o email está confirmado
- Teste as credenciais no painel do Supabase

### Calendário não carrega

- Verifique se há dados na tabela `appointments`
- Abra o console do navegador e veja erros
- Confirme que as datas estão no formato correto (YYYY-MM-DD)

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação do [Supabase](https://supabase.com/docs)
2. Consulte a documentação do [React](https://react.dev)
3. Veja exemplos no [Shadcn/UI](https://ui.shadcn.com)

## 📄 Licença

Projeto de uso livre. Customize conforme necessário para suas necessidades.
