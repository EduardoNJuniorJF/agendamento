# Changelog

Todas as alterações relevantes do sistema são documentadas aqui.

---

## [1.2.0] - 2026-03-03

### 🛡️ Preservação de Histórico de Agentes

- **Soft-delete de agentes**: Agentes agora são **desativados** em vez de excluídos, preservando todo o histórico de agendamentos e bonificações.
- **Migração de banco de dados**: A constraint `appointment_agents_agent_id_fkey` foi alterada de `ON DELETE CASCADE` para `ON DELETE SET NULL`, impedindo perda de dados ao remover um agente.
- **UI atualizada**: O botão de exclusão na página de Equipe agora exibe "Desativar Agente" com mensagem explicativa sobre a preservação do histórico.

### ✅ Diálogos de Confirmação de Exclusão

- **Novo componente `ConfirmDeleteDialog`**: Modal reutilizável com confirmação visual antes de qualquer ação destrutiva.
- **Páginas atualizadas**:
  - Frota (exclusão de veículos)
  - Dashboard (exclusão de agendamentos)
  - Equipe (desativação de agentes)
  - Férias (exclusão de férias e folgas)
  - Banco de Horas (exclusão de registros)
  - Bonificação (exclusão de cidades)
  - Celebrações (exclusão de aniversários, datas sazonais e feriados)

---

## [1.1.0] - Versões anteriores

### Funcionalidades principais

- Sistema de agendamentos com calendário e drag-and-drop
- Gestão de equipe com setores e cores de identificação
- Sistema de bonificação por cidade com níveis configuráveis
- Gestão de frota (veículos com status)
- Controle de férias e folgas
- Banco de horas com transações
- Celebrações (aniversários, datas sazonais, feriados locais)
- Autenticação com controle de roles (`dev`, `admin`, `user`, `financeiro`)
- Filtros por setor para usuários não-administrativos
- Realtime updates via Supabase
- Dashboard com visão geral dos agendamentos
- Importação de dados via CSV
