# Sistema de Permissionamento e Regras de Acesso

Este documento descreve como funciona o controle de acesso e permissões do sistema Fleet Manager.

---

## 1. Estrutura de Autenticação

### 1.1 Login por Username
- Usuários autenticam usando **username** (não email)
- O sistema converte username para email via função `get_email_from_username()`
- Senha padrão inicial: `123` (usuários podem alterar após login)

### 1.2 Tabelas de Autenticação

| Tabela | Descrição |
|--------|-----------|
| `auth.users` | Tabela nativa do Supabase com dados de autenticação |
| `profiles` | Dados do perfil do usuário (username, full_name, sector, email) |
| `user_roles` | Papel/função do usuário no sistema (separada por segurança) |

---

## 2. Papéis (Roles)

O sistema utiliza 4 papéis definidos no enum `app_role`:

| Role | Descrição | Nível de Acesso |
|------|-----------|-----------------|
| `dev` | Desenvolvedor | Acesso total irrestrito a todas as funcionalidades |
| `admin` | Administrador | Gerenciamento completo conforme regras do setor |
| `user` | Usuário | Visualização e operações limitadas |
| `financeiro` | Financeiro | Acesso específico a relatórios financeiros |

### 2.1 Proteção do Usuário Dev
- O usuário `dev` (email: `dev@sistema.com`) é **oculto** da lista de usuários
- O cargo "Desenvolvedor" não aparece nas opções de seleção
- Apenas o próprio usuário Dev pode ver a si mesmo

---

## 3. Setores

O sistema organiza usuários em setores que determinam a visibilidade dos dados:

| Setor | Código |
|-------|--------|
| Comercial | `Comercial` |
| Suporte | `Suporte` |
| Desenvolvimento | `Desenvolvimento` |
| Administrativo | `Administrativo` |
| Loja | `Loja` |

---

## 4. Matriz de Permissões por Página

### 4.1 Dashboard

| Setor | Visualização |
|-------|--------------|
| Comercial | Dashboard completo |
| Administrativo | Dashboard completo |
| Suporte/Desenvolvimento/Loja | Apenas cards de férias/folgas |
| Dev | Dashboard completo |

### 4.2 Calendário de Agendamentos

| Setor/Role | Acesso | Permissões |
|------------|--------|------------|
| Comercial (Admin) | ✅ | CRUD completo |
| Comercial (User) | ✅ | Somente leitura |
| Suporte/Desenvolvimento/Loja | ❌ | Sem acesso |
| Administrativo | ✅ | Somente leitura |
| Dev | ✅ | CRUD completo |

### 4.3 Frota (Veículos)

| Setor/Role | Acesso | Permissões |
|------------|--------|------------|
| Comercial (Admin) | ✅ | CRUD completo |
| Comercial (User) | ✅ | Somente leitura |
| Suporte/Desenvolvimento/Loja | ❌ | Sem acesso |
| Administrativo | ✅ | Somente leitura |
| Dev | ✅ | CRUD completo |

### 4.4 Bonificação

| Setor/Role | Acesso | Permissões |
|------------|--------|------------|
| Comercial (Admin) | ✅ | CRUD completo |
| Comercial (User) | ✅ | Somente leitura |
| Suporte/Desenvolvimento/Loja | ❌ | Sem acesso |
| Administrativo | ✅ | Somente leitura |
| Dev | ✅ | CRUD completo |

### 4.5 Férias e Folgas

| Setor/Role | Acesso | Visualização | Gerenciamento |
|------------|--------|--------------|---------------|
| Comercial (Admin) | ✅ | Próprio setor | Próprio setor |
| Comercial (User) | ✅ | Próprio setor | ❌ |
| Suporte (Admin) | ✅ | Próprio setor | Próprio setor |
| Desenvolvimento (Admin) | ✅ | Próprio setor | Próprio setor |
| Loja (Admin) | ✅ | Próprio setor | Próprio setor |
| Administrativo (Admin) | ✅ | **Todos os setores** | **Todos os setores** |
| Administrativo (User) | ✅ | Todos os setores | ❌ |
| Dev | ✅ | Todos os setores | Todos os setores |

### 4.6 Banco de Horas

| Role | Acesso |
|------|--------|
| Dev | ✅ Aba exclusiva visível |
| Outros | ❌ Aba oculta |

### 4.7 Celebrações (Aniversários, Datas Comemorativas, Feriados)

| Setor/Role | Visualização | Gerenciamento |
|------------|--------------|---------------|
| Todos autenticados | ✅ | ❌ |
| Comercial (Admin) | ✅ | ✅ |
| Administrativo (Admin) | ✅ | ✅ |
| Dev | ✅ | ✅ |

### 4.8 Gestão de Usuários

| Setor/Role | Acesso | Escopo de Gerenciamento |
|------------|--------|------------------------|
| Comercial (Admin) | ✅ | Todos os setores |
| Suporte (Admin) | ✅ | Apenas Suporte |
| Desenvolvimento (Admin) | ✅ | Apenas Desenvolvimento |
| Loja (Admin) | ✅ | Apenas Loja |
| Administrativo (Admin) | ✅ | Apenas Administrativo |
| Dev | ✅ | Todos os setores |
| Users (qualquer setor) | ❌ | Sem acesso |

---

## 5. Agentes vs Usuários

O sistema diferencia entre **Agentes** e **Usuários**:

| Conceito | Descrição |
|----------|-----------|
| **Usuário** | Qualquer pessoa com acesso ao sistema |
| **Agente** | Usuário que pode ser atribuído a agendamentos |

- Nem todo usuário é um agente
- Todo agente é um usuário
- Ao criar um usuário, o admin pode marcar como "É Agente"
- Agentes podem ter uma cor associada para identificação no calendário
- Agentes podem ser marcados como "Recebe Bonificação" para aparecer nos relatórios de bônus

---

## 6. Funções de Verificação (Database)

O sistema utiliza funções SQL `SECURITY DEFINER` para verificar permissões:

```sql
-- Verifica se usuário tem determinado papel
has_role(_user_id uuid, _role app_role) → boolean

-- Obtém o papel do usuário
get_user_role(_user_id uuid) → app_role

-- Obtém o setor do usuário
get_user_sector(_user_id uuid) → text

-- Verifica acesso a páginas específicas
can_access_calendar(_user_id uuid) → boolean
can_access_fleet(_user_id uuid) → boolean
can_access_bonus(_user_id uuid) → boolean
can_manage_celebrations(_user_id uuid) → boolean

-- Verifica permissão de edição
can_edit_calendar(_user_id uuid) → boolean
can_edit_fleet(_user_id uuid) → boolean
can_edit_bonus(_user_id uuid) → boolean
```

---

## 7. Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado. Exemplos de políticas:

### 7.1 Políticas por Tabela

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `profiles` | Todos | Service Role | Próprio usuário | Service Role |
| `user_roles` | Próprio ou Admin/Dev | Service Role | Service Role | Service Role |
| `agents` | Autenticados | Permitido | Permitido | Permitido |
| `appointments` | Autenticados | Permitido | Permitido | Permitido |
| `vacations` | Autenticados | Autenticados | Autenticados | Autenticados |
| `time_bank` | Autenticados | Dev apenas | Dev apenas | Dev apenas |
| `bonus_settings` | Autenticados | Admin/Dev | Admin/Dev | Admin/Dev |
| `birthdays` | Autenticados | Managers | Managers | Managers |

### 7.2 Exemplo de Política com Função

```sql
CREATE POLICY "Admins can update bonus_settings" 
ON public.bonus_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));
```

---

## 8. Fluxo de Verificação de Acesso

```
┌─────────────────┐
│  Usuário Logado │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar Role  │
│ (user_roles)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verificar Setor │
│ (profiles)      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Aplicar Regras de Acesso    │
│ (AuthContext + RLS)         │
└─────────────────────────────┘
```

---

## 9. Resumo Visual de Acesso

```
                    │ Calendar │ Fleet │ Bonus │ Vacations │ Celebrations │ Users │ TimeBank
────────────────────┼──────────┼───────┼───────┼───────────┼──────────────┼───────┼─────────
Dev                 │   ✅✏️   │  ✅✏️ │  ✅✏️ │   ✅✏️    │     ✅✏️     │  ✅✏️ │   ✅✏️
────────────────────┼──────────┼───────┼───────┼───────────┼──────────────┼───────┼─────────
Comercial Admin     │   ✅✏️   │  ✅✏️ │  ✅✏️ │   ✅✏️*   │     ✅✏️     │  ✅✏️ │   ❌
Comercial User      │   ✅     │  ✅   │  ✅   │   ✅      │     ✅       │  ❌   │   ❌
────────────────────┼──────────┼───────┼───────┼───────────┼──────────────┼───────┼─────────
Administrativo Admin│   ✅     │  ✅   │  ✅   │   ✅✏️**  │     ✅✏️     │  ✅✏️*│   ❌
Administrativo User │   ✅     │  ✅   │  ✅   │   ✅**    │     ✅       │  ❌   │   ❌
────────────────────┼──────────┼───────┼───────┼───────────┼──────────────┼───────┼─────────
Suporte/Dev/Loja    │   ❌     │  ❌   │  ❌   │   ✅✏️*   │     ✅       │  ✅✏️*│   ❌

✅ = Acesso de leitura
✏️ = Pode editar/criar/excluir
* = Apenas próprio setor
** = Todos os setores
```

---

## 10. Edge Functions de Gerenciamento

As operações de CRUD de usuários são realizadas via Edge Functions com validação server-side:

| Function | Descrição | Requer Role |
|----------|-----------|-------------|
| `create-user` | Cria novo usuário | Admin ou Dev |
| `update-user` | Atualiza usuário existente | Admin ou Dev |
| `delete-user` | Remove usuário | Admin ou Dev |
| `create-initial-users` | Setup inicial do sistema | Service Role |

---

## 11. Boas Práticas de Segurança

1. **Roles em tabela separada**: Nunca armazenar roles na tabela `profiles`
2. **Funções SECURITY DEFINER**: Usar para evitar recursão em RLS
3. **Validação server-side**: Edge Functions validam permissões antes de executar
4. **Proteção do Dev**: Usuário dev oculto para segurança
5. **RLS em todas as tabelas**: Nenhuma tabela sem políticas de segurança

---

*Documento gerado em: Janeiro/2026*
*Versão do Sistema: Fleet Manager v1.0*
