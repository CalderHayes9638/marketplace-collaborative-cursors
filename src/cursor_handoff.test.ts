import test from "node:test";
import assert from "node:assert/strict";
import { handoffAsset } from "./cursor_handoff.ts";

test("handoff validates the editor payload and publishes the buyer cursor", async () => {
  const calls: Array<[string, unknown]> = [];
  const api = {
    verifySession: async (id: string) => { calls.push(["verify", id]); },
    createChannel: async (channel: string) => { calls.push(["channel", channel]); },
    issueToken: async () => ({ token: "client-token" }),
    publish: async (payload: unknown) => { calls.push(["publish", payload]); }
  };
  const result = await handoffAsset({ session_id: "s1", seller_id: "seller", buyer_id: "buyer", asset_id: "asset", cursor: { line: 2, column: 3 }, note: "Use the approved thumbnail" }, api as never);
  assert.equal(result.channel, "asset:asset");
  assert.deepEqual(calls.map(([name]) => name), ["verify", "channel", "publish"]);
  assert.equal((calls[2][1] as { event: string }).event, "order.handoff");
});
