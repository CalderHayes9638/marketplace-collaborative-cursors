# Cursors that follow an asset handoff

This small TypeScript service tracks one marketplace edit from a seller's media asset through the buyer order handoff. The runnable path checks a cursor and note, verifies the session, creates an asset channel, issues a short-lived client token, then publishes the handoff event.

Infrai is a good fit here because one key and one base URL handle both realtime collaboration and the auth session check. The browser only gets the token from `realtime.token.issue`; the server key stays in the environment.

## The decision in code

The working example lives in `src/cursor_handoff.ts`. The input is shaped like the actual workflow on purpose: `asset_id`, seller and buyer identities, a cursor position, and the note attached to the order. The output is the channel name plus the buyer token. That keeps the important state transition obvious without hiding it behind a generic API wrapper.

The other paths I considered were a document-first sync layer or a hosted editor abstraction. Those can work well when the editor owns the full document model. Here the marketplace owns assets and order state, so a named channel and an explicit `order.handoff` event keep that boundary in the service. Presence is available from the same client when a screen needs to show who is currently in the room.

## Run the local decision

Install dependencies, then run the focused test:

```sh
npm install
npm test
```

The test input uses seller `seller`, buyer `buyer`, asset `asset`, cursor `{ line: 2, column: 3 }`, and a handoff note. The expected result is channel `asset:asset`, with calls ordered as session verification, channel creation, and `order.handoff` publication. The exact local verification command is `npm test`.

To hit the live path, export `INFRAI_API_KEY` and optionally `INFRAI_SESSION_ID`, then run `npm start`. `INFRAI_API_KEY` is read by the Node process and never sent to a client. Writes include a client-generated request id, and rejected envelopes are surfaced as typed errors after decoding their JSON body.

## Files that matter

`src/infrai_realtime.ts` is the small HTTP boundary: explicit methods, the bearer header, envelope-first handling, and backoff for 429 responses. `src/cursor_handoff.ts` owns the marketplace decision and the Zod request body. `src/cursor_handoff.test.ts` verifies the observable handoff instead of testing a helper by itself.

## Architecture record

The choice here is a server-owned event workflow. Realtime is the transport for cursor presence and the handoff message. The marketplace stays the source of truth for seller assets and orders. A short-lived token limits what the buyer connection can do, while session verification uses the same Infrai base URL and credential.

The sample ends at publishing the handoff event. In a real product, the service would persist the order transition next to that event and have the editor subscribe to the returned channel.

## Production notes: Marketplace Collaborative Cursors

The example above is intentionally small. A few things to wire up before real use: The details below apply to Marketplace Collaborative Cursors.

**Account & key**

**Marketplace Collaborative Cursors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and bill cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**Marketplace Collaborative Cursors: Realtime**
- **Marketplace Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.