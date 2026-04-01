
CREATE OR REPLACE FUNCTION public.calculate_reliability_score(tech_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rating_score numeric := 0;
  success_score numeric := 0;
  total_repairs_count integer;
  avg_rating_val numeric;
  repairs_with_claims integer;
  final_score numeric;
BEGIN
  SELECT total_repairs, avg_rating
  INTO total_repairs_count, avg_rating_val
  FROM technician_profiles
  WHERE id = tech_id;

  IF total_repairs_count IS NULL OR total_repairs_count = 0 THEN
    RETURN 0;
  END IF;

  -- 60% from customer rating (avg_rating out of 5, scaled to 100)
  rating_score := COALESCE(avg_rating_val, 0) / 5.0 * 100;

  -- 40% from repair success rate (repairs without claims / total repairs * 100)
  SELECT COUNT(DISTINCT c.booking_id) INTO repairs_with_claims
  FROM claims c
  WHERE c.technician_id = tech_id AND c.status = 'approved';

  success_score := ((total_repairs_count - COALESCE(repairs_with_claims, 0))::numeric / total_repairs_count::numeric) * 100;

  final_score := ROUND(
    rating_score * 0.60 +
    success_score * 0.40
  );

  UPDATE technician_profiles SET reliability_score = final_score WHERE id = tech_id;

  RETURN final_score;
END;
$function$;
