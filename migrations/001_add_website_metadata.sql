-- Add metadata column to store optional structured information about websites
ALTER TABLE websites
ADD COLUMN metadata TEXT;
