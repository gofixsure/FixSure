
-- Trigger: auto-update avg_rating + reliability score when a review is inserted
CREATE TRIGGER on_review_inserted
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_technician_rating();

-- Trigger: auto-update total_repairs + platform_dues + reliability score when a repair is inserted
CREATE TRIGGER on_repair_inserted
  AFTER INSERT ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_repairs();

-- Trigger: auto-update claim_rate + reliability score when a claim status changes
CREATE TRIGGER on_claim_updated
  AFTER UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_claim_rate();
