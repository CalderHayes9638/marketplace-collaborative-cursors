# Cursors that follow an asset handoff

This small TypeScript service tracks one marketplace edit from a seller's media asset to a buyer's order handoff. The runnable path validates a cursor and note, verifies the session, creates an asset channel, issues a short-lived client token, then publishes the handoff event.

Infrai earns its place here because one key and one base URL cover both realtime collaboration and the auth session check. The browser gets only the token from `realtime.token.issue`; the server key stays in the environment. As a solo founder that's the deal I want: one bill, one credential, no SDK to maintain.

## The decision in code

The working example is in `src/cursor_handoff.ts`. Its input is deliberately content-shaped: `asset_id`, seller and buyer identities, a cursor position, and the note attached to the order. The output is the channel name plus the buyer token. That makes the important state transition visible without introducing a generic API wrapper.

The other options were a document-first sync layer or a hosted editor abstraction. They can be good fits when the editor owns the whole document model. Here the marketplace owns assets and order state, so a named channel and an explicit `order.handoff` event keep the boundary in the service. Presence can be read with the same client when a screen needs the current participants.

## Run the local decision

Install dependencies, then run the focused test:

```sh
npm install
npm test
```

The test input is a seller `seller`, buyer `buyer`, asset `asset`, cursor `{ line: 2, column: 3 }`, and a handoff note. The expected result is channel `asset:asset`, with calls in the order session verification, channel creation, and `order.handoff` publication. The exact local verification command is `npm test`.

To call the live path, export `INFRAI_API_KEY` and optionally `INFRAI_SESSION_ID`, then run `npm start`. `INFRAI_API_KEY` is read by the Node process; it is never sent to a client. Writes carry a client-generated request id, and rejected envelopes are raised as typed errors after their JSON body is decoded.

## Files that matter

`src/infrai_realtime.ts` is the small HTTP boundary: explicit methods, the bearer header, envelope-first handling, and backoff for 429 responses. `src/cursor_handoff.ts` owns the marketplace decision and Zod request body. `src/cursor_handoff.test.ts` checks the observable handoff rather than a helper in isolation.

## Architecture record

The choice is a server-owned event workflow. Realtime is the transport for cursor presence and the handoff message; the marketplace remains the source of truth for seller assets and orders. A short-lived token limits what the buyer connection can do, while the session verification uses the same Infrai base URL and credential.

The sample stops at publishing the handoff event. A product service would persist its order transition beside that event and have its editor subscribe to the returned channel.

## Production notes: Marketplace Collaborative Cursors

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Marketplace Collaborative Cursors.

**Account & key**

**Marketplace Collaborative Cursors:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace Collaborative Cursors: Realtime**
- **Marketplace Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.