-- Drop duplicate trigger
DROP TRIGGER on_repair_inserted ON public.repairs;

-- Fix the incorrect data: reset and recalculate from actual repairs
UPDATE technician_profiles tp
SET total_repairs = sub.cnt,
    platform_dues = sub.total_fees
FROM (
  SELECT technician_id, COUNT(*) as cnt, COALESCE(SUM(fixsure_fee), 0) as total_fees
  FROM repairs
  GROUP BY technician_id
) sub
WHERE tp.id = sub.technician_id;