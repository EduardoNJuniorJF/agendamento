
-- Enable Realtime for all main tables
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE time_off;
ALTER PUBLICATION supabase_realtime ADD TABLE vacations;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bonus_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE city_bonus_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE local_holidays;
ALTER PUBLICATION supabase_realtime ADD TABLE birthdays;
ALTER PUBLICATION supabase_realtime ADD TABLE seasonal_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE user_bonus_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE time_bank;
ALTER PUBLICATION supabase_realtime ADD TABLE time_bank_transactions;
