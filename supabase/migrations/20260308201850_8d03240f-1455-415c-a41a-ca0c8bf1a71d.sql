-- Trigger to increment total_repairs when a repair is inserted
CREATE OR REPLACE FUNCTION public.update_total_repairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE technician_profiles
  SET total_repairs = COALESCE(total_repairs, 0) + 1
  WHERE id = NEW.technician_id;

  -- Recalculate reliability score
  PERFORM calculate_reliability_score(NEW.technician_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_repair_insert
  AFTER INSERT ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_repairs();

-- Fix current data: count existing repairs
UPDATE technician_profiles tp
SET total_repairs = (SELECT COUNT(*) FROM repairs r WHERE r.technician_id = tp.id);

-- Recalculate reliability score for AK
SELECT calculate_reliability_score('14843472-968f-4050-baa0-409af1991010');