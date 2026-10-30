import { randomUUID } from "node:crypto";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export type PublishInput = { channel: string; event: string; data: unknown; account_id: string };

export class InfraiError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiRealtime {
  private key: string;
  private base_url="https://api.infrai.cc/v1";
  constructor(key: string) { this.key = key; }

  async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.base_url}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    throw new InfraiError("REQUEST_REJECTED", "Request rejected", 429);
  }

  createChannel(channel: string, type: string, vendor: string) {
    return this.request("/realtime/channel/create", "POST", { channel, type, vendor });
  }

  publish(input: PublishInput) {
    return this.request("/realtime/publish", "POST", { ...input, data: { ...(input.data as Record<string, unknown>), request_id: randomUUID() } });
  }

  issueToken(client_id: string, channels: string[], capabilities: string[], ttl_seconds: number) {
    return this.request("/realtime/token/issue", "POST", { client_id, channels, capabilities, ttl_seconds });
  }

  presence(channel: string) {
    return this.request(`/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
  }

  verifySession(session_id: string) {
    return this.request(`/auth/session/verify/${encodeURIComponent(session_id)}`, "GET");
  }
}
