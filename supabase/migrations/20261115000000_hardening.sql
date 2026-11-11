-- =====================================================================
-- تقوية الأمان (توصيات Supabase Advisor)
-- =====================================================================

-- مسار بحث ثابت لدالة التحديث
alter function public.set_updated_at() set search_path = '';

-- دوال الـ triggers لا تحتاج أن تُستدعى عبر API (الـ trigger يعمل بدون صلاحية EXECUTE)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_comment_author() from public, anon, authenticated;
revoke execute on function public.comments_rate_limit() from public, anon, authenticated;
revoke execute on function public.sync_comment_author_name() from public, anon, authenticated;

-- دوال الأدوار تُستخدم في سياسات RLS للمستخدمين المسجّلين فقط
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.staff_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_editor() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.staff_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_editor() to authenticated;
