-- Remove legacy profile-link trigger that can break invited student signup.
--
-- The current supported profile linking trigger is
-- on_profile_created_or_updated -> public.link_student_profile(). Some live
-- databases still have an older trigger/function pair that performs overlapping
-- work and can throw during Supabase Auth signup.

DROP TRIGGER IF EXISTS trg_link_student_profile_on_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.link_student_profile_on_profile_insert();

DROP TRIGGER IF EXISTS on_profile_created_or_updated ON public.profiles;
CREATE TRIGGER on_profile_created_or_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_student_profile();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
