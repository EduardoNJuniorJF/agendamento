-- Correção pontual: reverter descontos indevidos de horas do usuário Paulo Cezar
-- Observação: isso cria uma transação de ajuste para manter o histórico.
SELECT public.upsert_time_bank(
  p_user_id := '17c81a8b-a9f6-4144-85aa-dbe3f33dedef'::uuid,
  p_hours_change := 88,
  p_bonus_change := 0,
  p_description := 'Correção: reversão de 11 descontos indevidos de 8h (total +88h) sem folga vinculada',
  p_transaction_type := 'correction',
  p_related_time_off_id := NULL,
  p_created_by := NULL
);
