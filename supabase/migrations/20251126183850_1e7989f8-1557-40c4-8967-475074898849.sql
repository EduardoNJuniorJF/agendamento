-- Update expense_status enum with new values
-- First remove the default
ALTER TABLE appointments ALTER COLUMN expense_status DROP DEFAULT;

-- Convert to text temporarily
ALTER TABLE appointments ALTER COLUMN expense_status TYPE text;

-- Update the values
UPDATE appointments SET expense_status = 'não_separar' WHERE expense_status = 'pending';
UPDATE appointments SET expense_status = 'separar_dinheiro' WHERE expense_status = 'approved';
UPDATE appointments SET expense_status = 'separar_dia_anterior' WHERE expense_status = 'rejected';

-- Drop the old enum type
DROP TYPE expense_status;

-- Create the new enum type
CREATE TYPE expense_status AS ENUM ('não_separar', 'separar_dinheiro', 'separar_dia_anterior');

-- Convert column back to enum with new default
ALTER TABLE appointments 
  ALTER COLUMN expense_status TYPE expense_status USING expense_status::expense_status,
  ALTER COLUMN expense_status SET DEFAULT 'não_separar'::expense_status;