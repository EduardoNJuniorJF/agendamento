import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook que escuta mudanças em tempo real nas tabelas do Supabase
 * e chama o callback de refresh quando detecta INSERT, UPDATE ou DELETE.
 *
 * @param tables - Lista de nomes de tabelas para monitorar
 * @param onRefresh - Função chamada quando qualquer mudança é detectada
 */
export function useRealtimeRefresh(tables: string[], onRefresh: () => void) {
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    tables.forEach((table) => {
      const channel = supabase
        .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            onRefresh();
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables.join(',')]); // stable dependency
}
