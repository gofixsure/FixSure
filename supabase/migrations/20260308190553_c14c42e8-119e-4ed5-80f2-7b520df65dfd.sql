
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'technician' THEN
    INSERT INTO public.technician_profiles (id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;
