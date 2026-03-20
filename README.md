# chat-adapter-asana

[![npm version](https://img.shields.io/npm/v/chat-adapter-asana)](https://www.npmjs.com/package/chat-adapter-asana)
[![npm downloads](https://img.shields.io/npm/dm/chat-adapter-asana)](https://www.npmjs.com/package/chat-adapter-asana)
[![codecov](https://codecov.io/gh/pleaseai/chat-adapter-asana/graph/badge.svg)](https://codecov.io/gh/pleaseai/chat-adapter-asana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Asana adapter for [Chat SDK](https://chat-sdk.dev/docs). Maps Asana task comment threads to the Chat SDK Thread/Message model.

## Installation

```bash
npm install chat chat-adapter-asana
```

## Usage

```typescript
import { Chat } from "chat";
import { createAsanaAdapter } from "chat-adapter-asana";
import { createMemoryState } from "@chat-adapter/state-memory";

const bot = new Chat({
  userName: "asana-bot",
  adapters: {
    asana: createAsanaAdapter({
      accessToken: process.env.ASANA_ACCESS_TOKEN!,
    }),
  },
  state: createMemoryState(),
});

bot.onNewMention(async (thread, message) => {
  await thread.post("Hello from Asana!");
});

// Wire up the webhook in your HTTP framework
// e.g. Next.js App Router:
export async function POST(request: Request) {
  return bot.webhooks.asana(request);
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASANA_ACCESS_TOKEN` | Yes | Personal access token or service account token |
| `ASANA_WEBHOOK_SECRET` | No | Stored automatically during webhook handshake |

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessToken` | `string` | `ASANA_ACCESS_TOKEN` | Asana API access token |
| `baseUrl` | `string` | `"https://app.asana.com/api/1.0"` | Asana API base URL |
| `userName` | `string` | `"asana-bot"` | Bot display name |
| `logger` | `Logger` | `ConsoleLogger` | Custom logger instance |

## Platform setup

1. **Create an Asana service account** or use a personal access token from [Asana Developer Console](https://app.asana.com/0/developer-console)
2. **Set up a webhook** by calling the Asana [webhooks API](https://developers.asana.com/reference/createwebhook) targeting your endpoint:
   ```bash
   curl -X POST https://app.asana.com/api/1.0/webhooks \
     -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "data": {
         "resource": "<project_gid>",
         "target": "https://your-domain.com/api/webhooks/asana",
         "filters": [
           { "resource_type": "story", "action": "added" }
         ]
       }
     }'
   ```
3. The adapter automatically handles the **webhook handshake** (responds to `X-Hook-Secret` headers)
4. Set the webhook URL to `https://your-domain.com/api/webhooks/asana`

## Concept mapping

| Asana | Chat SDK |
|-------|----------|
| Task | Thread |
| Story (comment) | Message |
| Story author | `message.author` |
| Like on a story | Reaction (heart) |
| @mention in comment | Mention detection |

## Features

- Webhook handshake and HMAC-SHA256 signature verification
- Task comment threads (post, edit, delete)
- Message history (fetch task stories)
- Reactions (like/unlike stories)
- @mention detection
- Rich text support (Asana HTML to mdast)

## Thread ID format

```
asana:{taskGid}
```

Task GIDs are Asana's numeric identifiers for tasks.

## License

MIT
