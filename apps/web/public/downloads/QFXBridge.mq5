//+------------------------------------------------------------------+
//| QFXBridge.mq5 — يرسل صفقات حساب MT5 للوحة البوتات               |
//| ترسل بس (ما تستلم أوامر ولا تنفذ صفقات).                          |
//|                                                                  |
//| التركيب:                                                         |
//| 1) انسخ الملف لـ: File > Open Data Folder > MQL5 > Experts        |
//| 2) افتحه بـ MetaEditor واضغط Compile (F7)                         |
//| 3) Tools > Options > Expert Advisors: فعّل Allow WebRequest        |
//|    وضيف رابط اللوحة (مثلاً https://bots-panel-production.up.railway.app) |
//| 4) اسحب QFXBridge على أي شارت، والصق الرابط من اللوحة بـ PanelUrl |
//+------------------------------------------------------------------+
#property copyright "QFX"
#property version   "1.40"
#property strict

input string PanelUrl         = "";   // الرابط من لوحة QFX (صفحة MT5)
input string PanelSecret      = "";   // اختياري: السر يُرسل بترويسة X-QFX-Secret بدل وضعه في الرابط
input int    HeartbeatSeconds = 60;   // كل كم ثانية ترسل حالة الحساب
input string SymbolsFilter    = "";   // رموز مفصولة بفاصلة (فارغ = الكل)
input long   MagicFilter      = -1;   // رقم Magic (‎-1 = الكل)
input bool   SendBars         = true; // ترسل شموع رموز الصفقات حتى تطلع الشارتات باللوحة
input ENUM_TIMEFRAMES BarsTimeframe = PERIOD_M15; // فريم الشموع
input int    BarsCount        = 200;  // عدد الشموع
input int    BarsEveryMinutes = 5;    // كل كم دقيقة تتحدث الشموع
input bool   SendWatch        = true; // أسعار وشموع أسواق المتابعة اللي تختارها من اللوحة
input int    QuotesEverySeconds = 20; // كل كم ثانية ترسل أسعار أسواق المتابعة
input bool   ShowPanel        = true; // لوحة حالة على الشارت (المنصة، اللوحة، البوت، التحليل)
input ENUM_BASE_CORNER PanelCorner = CORNER_LEFT_UPPER; // مكان اللوحة على الشارت
input bool   PanelArabic      = true; // نصوص اللوحة بالعربي (false = English)

int ticks = 0;            // ثواني من آخر إرسال حالة
int barTicks = 0;         // ثواني من آخر إرسال شموع
int quoteTicks = 0;       // ثواني من آخر إرسال أسعار المتابعة
string watchSeen = "";    // آخر قائمة متابعة وصلت من البوت
int spin = 0;             // حركة مؤشر "التحليل جاري"
string reply = "";        // آخر رد من البوت (JSON)
int failStreak = 0;       // كم مرة فشل الإرسال ورا بعض
bool alerted = false;     // نبهنا المستخدم بنافذة (مرة وحدة لكل تشغيل)
string lastStatus = "";
datetime lastOk = 0;

//--- سطر الحالة على الشارت
void ShowStatus(string s)
  {
   lastStatus = s;
   Comment("QFXBridge 1.40\n", s, lastOk > 0 ? "\nآخر إرسال ناجح: " + TimeToString(lastOk, TIME_MINUTES | TIME_SECONDS) : "");
  }

//--- شرح الخطأ بالعربي حتى يعرف المستخدم شنو يسوي
string Explain(int err, int code)
  {
   if(err == 4014)
      return "رابط اللوحة مو مضاف. روح Tools > Options > Expert Advisors، فعّل Allow WebRequest وضيف رابط اللوحة (بدون المسار)";
   if(err == 5200 || err == 5201)
      return "الرابط بخانة PanelUrl غلط. انسخه من جديد من اللوحة (صفحة البوت > MT5)";
   if(err == 5202 || err == 5203)
      return "ما گدر يوصل للوحة: الإنترنت أو الجدار الناري أو اللوحة طافية";
   if(code == 404)
      return "الرابط قديم أو ناقص. انسخ الرابط من جديد من اللوحة";
   if(code == 502 || code == 503)
      return "البوت متوقف باللوحة. شغّله من صفحة البوت";
   if(code >= 400)
      return "اللوحة رفضت الرسالة (" + IntegerToString(code) + ")";
   return "خطأ " + IntegerToString(err);
  }

//--- تحويل نص لـ JSON
string Esc(string s)
  {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\n", " ");
   StringReplace(s, "\r", " ");
   return s;
  }

string Num(double v, int digits) { return DoubleToString(v, digits); }

bool Allowed(string symbol, long magic)
  {
   if(MagicFilter >= 0 && magic != MagicFilter)
      return false;
   if(StringLen(SymbolsFilter) == 0)
      return true;
   string parts[];
   int n = StringSplit(SymbolsFilter, ',', parts);
   for(int i = 0; i < n; i++)
     {
      string p = parts[i];
      StringTrimLeft(p);
      StringTrimRight(p);
      if(StringCompare(p, symbol, false) == 0)
         return true;
     }
   return false;
  }

//--- إرسال للوحة
bool Post(string json)
  {
   if(StringLen(PanelUrl) < 10)
     {
      Print("QFXBridge: حط الرابط من اللوحة بخانة PanelUrl");
      return false;
     }
   char data[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   if(StringLen(PanelSecret) > 0)
      headers += "X-QFX-Secret: " + PanelSecret + "\r\n";
   string resultHeaders;
   int len = StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0)
      ArrayResize(data, len - 1); // بدون الصفر بالنهاية
   ResetLastError();
   int code = WebRequest("POST", PanelUrl, headers, 8000, data, result, resultHeaders);
   int err = code == -1 ? GetLastError() : 0;
   if(code == 200)
     {
      string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      if(StringFind(body, "\"ok\"") >= 0)
         reply = body;
      failStreak = 0;
      lastOk = TimeCurrent();
      ShowStatus("متصل باللوحة ✓");
      return true;
     }
   failStreak++;
   string why = Explain(err, code);
   if(code > 0 && ArraySize(result) > 0)
      why += " — " + CharArrayToString(result, 0, MathMin(ArraySize(result), 120), CP_UTF8);
   Print("QFXBridge: فشل الإرسال (", err ? err : code, "): ", why);
   ShowStatus("❌ ما وصل للوحة: " + why);
   // نافذة تنبيه مرة وحدة إذا الفشل تكرر (مو أول مرة بس، حتى ما يزعج بانقطاع قصير)
   if(!alerted && (err == 4014 || code == 404 || failStreak >= 3))
     {
      alerted = true;
      Alert("QFXBridge: ", why);
     }
   return false;
  }

string SymbolInfo(string symbol)
  {
   return "\"digits\":" + IntegerToString((int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) +
          ",\"point\":" + Num(SymbolInfoDouble(symbol, SYMBOL_POINT), 8);
  }

//--- حالة الحساب + الصفقات المفتوحة
void SendAccount()
  {
   string j = "{\"type\":\"account\",\"login\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) +
              ",\"server\":\"" + Esc(AccountInfoString(ACCOUNT_SERVER)) + "\"" +
              ",\"company\":\"" + Esc(AccountInfoString(ACCOUNT_COMPANY)) + "\"" +
              ",\"currency\":\"" + Esc(AccountInfoString(ACCOUNT_CURRENCY)) + "\"" +
              ",\"balance\":" + Num(AccountInfoDouble(ACCOUNT_BALANCE), 2) +
              ",\"equity\":" + Num(AccountInfoDouble(ACCOUNT_EQUITY), 2) +
              ",\"margin\":" + Num(AccountInfoDouble(ACCOUNT_MARGIN), 2) +
              ",\"profit\":" + Num(AccountInfoDouble(ACCOUNT_PROFIT), 2) +
              ",\"leverage\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) +
              ",\"positions\":[";
   bool first = true;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      string symbol = PositionGetString(POSITION_SYMBOL);
      long magic = PositionGetInteger(POSITION_MAGIC);
      if(!Allowed(symbol, magic))
         continue;
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      if(!first)
         j += ",";
      first = false;
      j += "{\"ticket\":" + IntegerToString((long)ticket) +
           ",\"symbol\":\"" + Esc(symbol) + "\"" +
           ",\"side\":\"" + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\"" +
           ",\"volume\":" + Num(PositionGetDouble(POSITION_VOLUME), 2) +
           ",\"price\":" + Num(PositionGetDouble(POSITION_PRICE_OPEN), digits) +
           ",\"sl\":" + Num(PositionGetDouble(POSITION_SL), digits) +
           ",\"tp\":" + Num(PositionGetDouble(POSITION_TP), digits) +
           ",\"current\":" + Num(PositionGetDouble(POSITION_PRICE_CURRENT), digits) +
           ",\"profit\":" + Num(PositionGetDouble(POSITION_PROFIT), 2) +
           ",\"time\":" + IntegerToString((long)PositionGetInteger(POSITION_TIME)) +
           ",\"magic\":" + IntegerToString(magic) + "," + SymbolInfo(symbol) + "}";
     }
   j += "]}";
   Post(j);
  }

//--- شموع رمز واحد: [[وقت، فتح، أعلى، أدنى، إغلاق]، ...]
string TfName(ENUM_TIMEFRAMES tf)
  {
   string s = EnumToString(tf);
   StringReplace(s, "PERIOD_", "");
   return s;
  }

void SendBarsFor(string symbol)
  {
   if(!SendBars)
      return;
   MqlRates rates[];
   int n = CopyRates(symbol, BarsTimeframe, 0, MathMin(MathMax(BarsCount, 20), 300), rates);
   if(n <= 0)
      return;
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   string j = "{\"type\":\"bars\",\"symbol\":\"" + Esc(symbol) + "\",\"tf\":\"" + TfName(BarsTimeframe) + "\",\"digits\":" + IntegerToString(digits) + ",\"bars\":[";
   for(int i = 0; i < n; i++)
     {
      if(i > 0)
         j += ",";
      j += "[" + IntegerToString((long)rates[i].time) + "," + Num(rates[i].open, digits) + "," + Num(rates[i].high, digits) + "," +
           Num(rates[i].low, digits) + "," + Num(rates[i].close, digits) + "]";
     }
   j += "]}";
   Post(j);
  }

//--- شموع كل رمز بيه صفقة مفتوحة (كل رمز مرة وحدة)
void SendOpenBars()
  {
   string done = ",";
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      string symbol = PositionGetString(POSITION_SYMBOL);
      if(!Allowed(symbol, PositionGetInteger(POSITION_MAGIC)) || StringFind(done, "," + symbol + ",") >= 0)
         continue;
      done += symbol + ",";
      SendBarsFor(symbol);
     }
   SendWatchBars(done);
  }

//--- اسم الرمز عند الوسيط: XAUUSD ممكن يكون XAUUSD.m أو XAUUSDm أو GOLD
string Resolve(string want)
  {
   if(SymbolSelect(want, true) && SymbolInfoDouble(want, SYMBOL_BID) > 0)
      return want;
   string up = want;
   StringToUpper(up);
   int total = SymbolsTotal(false);
   for(int i = 0; i < total; i++)
     {
      string name = SymbolName(i, false);
      string n = name;
      StringToUpper(n);
      if(StringFind(n, up) == 0 && StringLen(n) <= StringLen(up) + 4)
        {
         SymbolSelect(name, true);
         return name;
        }
     }
   if(up == "XAUUSD")
      return Resolve("GOLD");
   if(up == "XAGUSD")
      return Resolve("SILVER");
   return "";
  }

//--- قائمة المتابعة من رد البوت ("watch":"XAUUSD,EURUSD")
int WatchList(string &out[])
  {
   string w = JStr("watch");
   if(w != watchSeen)
     {
      watchSeen = w;
      quoteTicks = QuotesEverySeconds; // قائمة جديدة: نرسل أسعارها هسه
     }
   if(StringLen(w) == 0)
      return 0;
   return StringSplit(w, ',', out);
  }

//--- أسعار أسواق المتابعة: السعر، السبريد، وافتتاح/أعلى/أدنى اليوم
void SendQuotes()
  {
   if(!SendWatch)
      return;
   string list[];
   int n = WatchList(list);
   if(n <= 0)
      return;
   string j = "{\"type\":\"quotes\",\"quotes\":[";
   string missing = "";
   int added = 0;
   for(int i = 0; i < n && i < 20; i++)
     {
      string want = list[i];
      StringTrimLeft(want);
      StringTrimRight(want);
      if(StringLen(want) == 0)
         continue;
      string sym = Resolve(want);
      MqlTick t;
      if(sym == "" || !SymbolInfoTick(sym, t) || t.bid <= 0)
        {
         missing += (StringLen(missing) ? "," : "") + want;
         continue;
        }
      int d = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      double o = iOpen(sym, PERIOD_D1, 0), hi = iHigh(sym, PERIOD_D1, 0), lo = iLow(sym, PERIOD_D1, 0);
      if(added > 0)
         j += ",";
      j += "{\"w\":\"" + Esc(want) + "\",\"s\":\"" + Esc(sym) + "\",\"bid\":" + Num(t.bid, d) + ",\"ask\":" + Num(t.ask, d) +
           ",\"d\":" + IntegerToString(d) + ",\"o\":" + Num(o, d) + ",\"h\":" + Num(hi, d) + ",\"l\":" + Num(lo, d) + "}";
      added++;
     }
   j += "],\"missing\":\"" + Esc(missing) + "\"}";
   Post(j);
  }

//--- شموع أسواق المتابعة (ويّا شموع الصفقات)
void SendWatchBars(string done)
  {
   if(!SendWatch)
      return;
   string list[];
   int n = WatchList(list);
   for(int i = 0; i < n && i < 20; i++)
     {
      string sym = Resolve(list[i]);
      if(sym == "" || StringFind(done, "," + sym + ",") >= 0)
         continue;
      done += sym + ",";
      SendBarsFor(sym);
     }
  }

//--- أول رسالة: إصدار الإضافة وحالة MT5 (للتشخيص باللوحة)
void SendHello()
  {
   string j = "{\"type\":\"hello\",\"version\":\"1.40\",\"build\":" + IntegerToString(TerminalInfoInteger(TERMINAL_BUILD)) +
              ",\"connected\":" + (TerminalInfoInteger(TERMINAL_CONNECTED) ? "true" : "false") +
              ",\"algo\":" + (TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) ? "true" : "false") +
              ",\"tradeAllowed\":" + (AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) ? "true" : "false") +
              ",\"login\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) +
              ",\"company\":\"" + Esc(AccountInfoString(ACCOUNT_COMPANY)) + "\"" +
              ",\"symbols\":\"" + Esc(SymbolsFilter) + "\",\"magic\":" + IntegerToString(MagicFilter) +
              ",\"heartbeat\":" + IntegerToString(HeartbeatSeconds) + ",\"sendBars\":" + (SendBars ? "true" : "false") + "}";
   Post(j);
  }


//--- قراءة قيمة من رد البوت (JSON بسيط)
string JStr(string key)
  {
   int p = StringFind(reply, "\"" + key + "\":");
   if(p < 0)
      return "";
   p += StringLen(key) + 3;
   if(StringGetCharacter(reply, p) == '"')
     {
      int e = StringFind(reply, "\"", p + 1);
      return e > p ? StringSubstr(reply, p + 1, e - p - 1) : "";
     }
   int e2 = p;
   while(e2 < StringLen(reply) && StringGetCharacter(reply, e2) != ',' && StringGetCharacter(reply, e2) != '}')
      e2++;
   return StringSubstr(reply, p, e2 - p);
  }

string T(string ar, string en) { return PanelArabic ? ar : en; }

string Ago(long secs)
  {
   if(secs < 60)
      return T("هسه", "now");
   if(secs < 3600)
      return T("قبل ", "") + IntegerToString(secs / 60) + T(" د", " min ago");
   return T("قبل ", "") + IntegerToString(secs / 3600) + T(" س", " h ago");
  }

void Row(int i, string text, color c)
  {
   string name = "SPB_row" + IntegerToString(i);
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER, PanelCorner);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI");
     }
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 22);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 30 + i * 20);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, i == 0 ? 10 : 9);
   ObjectSetInteger(0, name, OBJPROP_COLOR, c);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
  }

//--- لوحة الحالة: المنصة متصلة، اللوحة توصل، البوت شغال، والتحليل جاري (مؤشر يدور)
void DrawPanel()
  {
   if(!ShowPanel)
      return;
   if(ObjectFind(0, "SPB_bg") < 0)
     {
      ObjectCreate(0, "SPB_bg", OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_CORNER, PanelCorner);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_XDISTANCE, 12);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_YDISTANCE, 22);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_XSIZE, 300);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_YSIZE, 150);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_BGCOLOR, C'20,24,34');
      ObjectSetInteger(0, "SPB_bg", OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_COLOR, C'91,91,247');
      ObjectSetInteger(0, "SPB_bg", OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, "SPB_bg", OBJPROP_HIDDEN, true);
     }
   string spinner[4] = {"◐", "◓", "◑", "◒"};
   spin = (spin + 1) % 4;
   bool broker = (bool)TerminalInfoInteger(TERMINAL_CONNECTED);
   long sinceOk = lastOk > 0 ? (long)(TimeCurrent() - lastOk) : -1;
   bool panelOk = lastOk > 0 && failStreak == 0;
   bool paused = JStr("paused") == "true";
   bool posting = JStr("post") == "true";
   long lastAt = (long)StringToInteger(JStr("lastAt"));
   long now = (long)StringToInteger(JStr("now"));
   string lastTitle = JStr("lastTitle");
   color ok = clrLimeGreen, bad = clrTomato, warn = clrOrange, dim = C'150,160,180';

   Row(0, "QFXBridge 1.40  •  " + T("لوحة البوتات", "Bots panel"), C'160,160,255');
   Row(1, (broker ? "● " : "○ ") + T("المنصة: ", "Platform: ") + (broker ? T("متصلة بالوسيط", "connected to broker") : T("مو متصلة بالوسيط", "not connected")), broker ? ok : bad);
   Row(2, (panelOk ? "● " : "○ ") + T("اللوحة: ", "Panel: ") + (panelOk ? T("متصلة", "connected") + " · " + Ago(sinceOk) : (lastOk == 0 ? T("بانتظار أول اتصال", "waiting for first contact") : T("ما توصل", "unreachable"))), panelOk ? ok : (lastOk == 0 ? warn : bad));
   if(reply == "")
      Row(3, "○ " + T("البوت: لسه ما رد", "Bot: no reply yet"), dim);
   else
      Row(3, (paused ? "◌ " : "● ") + T("البوت: ", "Bot: ") + (paused ? T("موقوف مؤقتاً", "paused") : T("شغال", "running")) + "  ·  " + T("النشر: ", "posting: ") + (posting ? T("مفعّل", "on") : T("مطفي", "off")), paused ? warn : ok);
   bool working = panelOk && !paused && reply != "";
   Row(4, (working ? spinner[spin] + " " + T("التحليل جاري", "Analysis running") : "◌ " + T("التحليل متوقف", "Analysis stopped")) + (reply != "" ? "  ·  " + T("اليوم: ", "today: ") + JStr("today") + T(" منشور", " posts") : ""), working ? C'120,200,255' : dim);
   Row(5, lastAt > 0 ? T("آخر نشاط: ", "Last: ") + StringSubstr(lastTitle, 0, 34) + " · " + Ago(now - lastAt) : T("آخر نشاط: —", "Last: —"), dim);
   ChartRedraw(0);
  }

void ClearPanel()
  {
   ObjectsDeleteAll(0, "SPB_");
  }

int OnInit()
  {
   if(StringLen(PanelUrl) < 10)
     {
      ShowStatus("❌ حط الرابط من اللوحة بخانة PanelUrl (صفحة البوت > MT5)");
      Alert("QFXBridge: حط الرابط من اللوحة بخانة PanelUrl");
     }
   else
      ShowStatus("يتصل باللوحة…");
   EventSetTimer(1); // كل ثانية: تتحرك لوحة الحالة، والإرسال حسب HeartbeatSeconds
   SendHello();
   SendAccount();
   SendOpenBars();
   DrawPanel();
   Print("QFXBridge: شغال");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason) { EventKillTimer(); Comment(""); ClearPanel(); }
void OnTimer()
  {
   ticks++;
   barTicks++;
   quoteTicks++;
   if(ticks >= MathMax(15, HeartbeatSeconds))
     {
      ticks = 0;
      SendAccount();
     }
   if(SendWatch && quoteTicks >= MathMax(5, QuotesEverySeconds))
     {
      quoteTicks = 0;
      SendQuotes();
     }
   if(barTicks >= BarsEveryMinutes * 60)
     {
      barTicks = 0;
      SendOpenBars();
     }
   DrawPanel();
  }

//--- كل حركة بالحساب: فتح، إغلاق، تعديل وقف أو هدف
void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      if(!HistoryDealSelect(trans.deal))
         return;
      string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
      long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
      if(!Allowed(symbol, magic))
         return;
      long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
      long dealType = HistoryDealGetInteger(trans.deal, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         return;
      ulong posId = (ulong)HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
      double volume = HistoryDealGetDouble(trans.deal, DEAL_VOLUME);
      string common = "\"ticket\":" + IntegerToString((long)posId) + ",\"symbol\":\"" + Esc(symbol) + "\"" +
                      ",\"volume\":" + Num(volume, 2) + ",\"price\":" + Num(price, digits) +
                      ",\"time\":" + IntegerToString((long)HistoryDealGetInteger(trans.deal, DEAL_TIME)) +
                      ",\"magic\":" + IntegerToString(magic) + "," + SymbolInfo(symbol);
      if(entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_INOUT)
        {
         double sl = 0, tp = 0;
         if(PositionSelectByTicket(posId))
           {
            sl = PositionGetDouble(POSITION_SL);
            tp = PositionGetDouble(POSITION_TP);
           }
         Post("{\"type\":\"open\"," + common + ",\"side\":\"" + (dealType == DEAL_TYPE_BUY ? "buy" : "sell") + "\"" +
              ",\"sl\":" + Num(sl, digits) + ",\"tp\":" + Num(tp, digits) +
              ",\"comment\":\"" + Esc(HistoryDealGetString(trans.deal, DEAL_COMMENT)) + "\"}");
         SendBarsFor(symbol);
        }
      else
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
           {
            long reason = HistoryDealGetInteger(trans.deal, DEAL_REASON);
            string why = reason == DEAL_REASON_SL ? "sl" : reason == DEAL_REASON_TP ? "tp" : reason == DEAL_REASON_SO ? "so" : "manual";
            double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT) + HistoryDealGetDouble(trans.deal, DEAL_SWAP) + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
            bool partial = PositionSelectByTicket(posId);
            // صفقة الإغلاق عكس الصفقة: بيع يسكر شراء
            Post("{\"type\":\"close\"," + common + ",\"side\":\"" + (dealType == DEAL_TYPE_SELL ? "buy" : "sell") + "\"" +
                 ",\"profit\":" + Num(profit, 2) + ",\"reason\":\"" + why + "\",\"partial\":" + (partial ? "true" : "false") + "}");
            SendBarsFor(symbol); // شموع الصفقة حتى تبين بمذكرات التداول
           }
      return;
     }
   if(trans.type == TRADE_TRANSACTION_POSITION)
     {
      if(!PositionSelectByTicket(trans.position))
         return;
      string symbol = PositionGetString(POSITION_SYMBOL);
      if(!Allowed(symbol, PositionGetInteger(POSITION_MAGIC)))
         return;
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      Post("{\"type\":\"modify\",\"ticket\":" + IntegerToString((long)trans.position) + ",\"symbol\":\"" + Esc(symbol) + "\"" +
           ",\"sl\":" + Num(PositionGetDouble(POSITION_SL), digits) + ",\"tp\":" + Num(PositionGetDouble(POSITION_TP), digits) + "}");
     }
  }
//+------------------------------------------------------------------+
