-- Primeiro remover a FK existente
ALTER TABLE public.vacations DROP CONSTRAINT IF EXISTS vacations_agent_id_fkey;

-- Adicionar a nova FK referenciando profiles
ALTER TABLE public.vacations 
ADD CONSTRAINT vacations_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Renomear a coluna para user_id para melhor semântica
ALTER TABLE public.vacations RENAME COLUMN agent_id TO user_id;