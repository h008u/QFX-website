-- بيانات تجريبية للتطوير المحلي (supabase db reset)
insert into public.signals (symbol, asset_class, direction, entry_price, stop_loss, take_profit_1, take_profit_2, status, result_pips, notes, closed_at)
values
  ('XAUUSD', 'gold',  'BUY',  2350.50, 2340.00, 2365.00, 2380.00, 'tp_hit', 145, 'ارتداد من منطقة طلب قوية', now() - interval '2 days'),
  ('EURUSD', 'forex', 'SELL', 1.08500, 1.08800, 1.08100, null,    'sl_hit', -30, null,                       now() - interval '1 day'),
  ('GBPUSD', 'forex', 'BUY',  1.26400, 1.26100, 1.26900, 1.27200, 'tp_hit', 50,  'كسر قمة سابقة',           now() - interval '20 hours'),
  ('USOIL',  'oil',   'SELL', 78.40,   79.20,   77.00,   null,    'open',   null, 'رفض عند مقاومة 78.5',     null);

insert into public.news (kind, asset_class, title, body, impact, currency, source)
values
  ('analysis', 'gold',  'الذهب يختبر مقاومة 2380', 'يتداول الذهب قرب مستوى مقاومة مهم، والإغلاق فوقه يفتح الطريق نحو 2400.', null, null, 'QFX'),
  ('news',     'forex', 'ترقب بيانات التضخم الأمريكية', 'تترقب الأسواق صدور مؤشر أسعار المستهلك وسط توقعات بتباطؤ طفيف.', 'high', 'USD', 'QFX');
