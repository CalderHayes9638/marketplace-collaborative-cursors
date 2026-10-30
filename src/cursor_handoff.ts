import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.ts";

export const HandoffRequest = z.object({
  session_id: z.string().min(1),
  seller_id: z.string().min(1),
  buyer_id: z.string().min(1),
  asset_id: z.string().min(1),
  cursor: z.object({ line: z.number().int().nonnegative(), column: z.number().int().nonnegative() }),
  note: z.string().min(1)
});
export type HandoffRequest = z.infer<typeof HandoffRequest>;

export async function handoffAsset(input: unknown, api: InfraiRealtime) {
  const request = HandoffRequest.parse(input);
  await api.verifySession(request.session_id);
  const channel = `asset:${request.asset_id}`;
  await api.createChannel(channel, "marketplace-editor", "realtime");
  const token = await api.issueToken(request.buyer_id, [channel], ["presence", "publish"], 900);
  await api.publish({
    channel,
    event: "order.handoff",
    data: { seller_id: request.seller_id, buyer_id: request.buyer_id, asset_id: request.asset_id, cursor: request.cursor, note: request.note },
    account_id: request.seller_id
  });
  return { channel, buyer_token: token };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const sample = { session_id: process.env.INFRAI_SESSION_ID ?? "session-from-login", seller_id: "seller-42", buyer_id: "buyer-7", asset_id: "cover-art-18", cursor: { line: 12, column: 4 }, note: "Approved crop for the product page" };
  const result = await handoffAsset(sample, new InfraiRealtime(key));
  console.log(JSON.stringify(result, null, 2));
}
