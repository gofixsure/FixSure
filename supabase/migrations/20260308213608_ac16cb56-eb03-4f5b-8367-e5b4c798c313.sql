
CREATE OR REPLACE FUNCTION public.calculate_reliability_score(tech_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  review_score numeric := 0;
  job_score numeric := 0;
  claim_score numeric := 0;
  total_repairs_count integer;
  avg_rating_val numeric;
  claim_rate_val numeric;
  final_score numeric;
BEGIN
  SELECT total_repairs, avg_rating, claim_rate
  INTO total_repairs_count, avg_rating_val, claim_rate_val
  FROM technician_profiles
  WHERE id = tech_id;

  IF total_repairs_count IS NULL OR total_repairs_count = 0 THEN
    RETURN 0;
  END IF;

  -- 50% from customer rating (avg_rating out of 5, scaled to 100)
  review_score := COALESCE(avg_rating_val, 0) / 5.0 * 100;

  -- 30% from repair success rate (completed / total)
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
    0
  ) INTO job_score
  FROM repairs WHERE technician_id = tech_id;

  -- 20% from claim performance (lower claim rate = higher score)
  claim_score := GREATEST(0, 100 - COALESCE(claim_rate_val, 0) * 10);

  final_score := ROUND(
    review_score * 0.50 +
    job_score * 0.30 +
    claim_score * 0.20
  );

  UPDATE technician_profiles SET reliability_score = final_score WHERE id = tech_id;

  RETURN final_score;
END;
$function$;
