// خادم Bot API وهمي محلي يسجّل الطلبات (للاختبارات فقط)
import { createServer, type Server } from "node:http";

export interface TgCall {
  method: string;
  params: Record<string, any>;
}

export class FakeTelegram {
  calls: TgCall[] = [];
  failChats = new Set<string>();
  private server: Server | null = null;
  private nextId = 100;
  url = "";

  async start() {
    this.server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const method = (req.url ?? "").split("/").pop() ?? "";
        const params = body ? JSON.parse(body) : {};
        this.calls.push({ method, params });
        res.setHeader("content-type", "application/json");
        if (params.chat_id !== undefined && this.failChats.has(String(params.chat_id))) {
          res.end(JSON.stringify({ ok: false, error_code: 403, description: "Forbidden: bot is not a member of the channel chat" }));
          return;
        }
        let result: unknown = true;
        if (method === "getMe") result = { id: 42, is_bot: true, first_name: "QFX", username: "qfx_bot" };
        else if (/^send/.test(method)) result = { message_id: this.nextId++, chat: { id: params.chat_id }, date: 0 };
        else if (method === "stopPoll") result = { id: "p", question: "q", total_voter_count: 10, options: [{ text: "📈 صعود", voter_count: 7 }, { text: "📉 هبوط", voter_count: 3 }] };
        res.end(JSON.stringify({ ok: true, result }));
      });
    });
    await new Promise<void>((r) => this.server!.listen(0, "127.0.0.1", () => r()));
    const addr = this.server.address() as { port: number };
    this.url = `http://127.0.0.1:${addr.port}`;
    return this;
  }
  stop() {
    this.server?.close();
  }
  sends(method = "sendMessage") {
    return this.calls.filter((c) => c.method === method);
  }
  reset() {
    this.calls = [];
    this.failChats.clear();
  }
}
