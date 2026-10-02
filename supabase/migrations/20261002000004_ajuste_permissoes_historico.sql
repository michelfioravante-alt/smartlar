-- =====================================================================
-- SmartLar - Migration 4: a função do histórico só roda via trigger,
-- nunca chamada diretamente pela API.
-- =====================================================================
revoke execute on function public.pedidos_registrar_historico() from public, anon, authenticated;
