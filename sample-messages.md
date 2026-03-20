# Asana sample messages

## Webhook handshake

Asana sends this on initial webhook setup. Respond with `X-Hook-Secret` header echoing the value.

```
POST /api/webhooks/asana
X-Hook-Secret: b13621f5c08e3b5a6c6e28c9dbf3789e
```

## Webhook event: story added (comment on task)

```json
{
  "events": [
    {
      "action": "added",
      "resource": {
        "gid": "1208574839265123",
        "resource_type": "story"
      },
      "parent": {
        "gid": "1208574839265000",
        "resource_type": "task"
      },
      "user": {
        "gid": "1208574839260001",
        "resource_type": "user"
      }
    }
  ]
}
```

Signature header: `X-Hook-Signature: <hmac-sha256 hex digest of body using webhook secret>`

## Story (comment) detail

Fetched via `GET /tasks/{task_gid}/stories`:

```json
{
  "gid": "1208574839265123",
  "resource_type": "story",
  "type": "comment",
  "text": "Hello, can someone look at this task?",
  "html_text": "<body>Hello, can someone look at this task?</body>",
  "created_at": "2024-06-15T14:30:00.000Z",
  "created_by": {
    "gid": "1208574839260001",
    "name": "Alice Johnson",
    "resource_type": "user"
  },
  "target": {
    "gid": "1208574839265000",
    "resource_type": "task"
  },
  "is_edited": false,
  "likes": [],
  "num_likes": 0
}
```

## Story with @mention

```json
{
  "gid": "1208574839265124",
  "resource_type": "story",
  "type": "comment",
  "text": "@asana-bot what is the status of this task?",
  "html_text": "<body><a data-asana-gid=\"1208574839260099\">@asana-bot</a> what is the status of this task?</body>",
  "created_at": "2024-06-15T14:35:00.000Z",
  "created_by": {
    "gid": "1208574839260001",
    "name": "Alice Johnson",
    "resource_type": "user"
  },
  "target": {
    "gid": "1208574839265000",
    "resource_type": "task"
  },
  "is_edited": false,
  "likes": [],
  "num_likes": 0
}
```

## Story with likes

```json
{
  "gid": "1208574839265125",
  "resource_type": "story",
  "type": "comment",
  "text": "Great work on this!",
  "created_at": "2024-06-15T15:00:00.000Z",
  "created_by": {
    "gid": "1208574839260002",
    "name": "Bob Smith",
    "resource_type": "user"
  },
  "target": {
    "gid": "1208574839265000",
    "resource_type": "task"
  },
  "is_edited": false,
  "likes": [
    {
      "gid": "1208574839270001",
      "user": {
        "gid": "1208574839260001",
        "name": "Alice Johnson",
        "resource_type": "user"
      }
    }
  ],
  "num_likes": 1
}
```

## Task detail

Fetched via `GET /tasks/{task_gid}`:

```json
{
  "gid": "1208574839265000",
  "resource_type": "task",
  "name": "Implement user authentication",
  "notes": "Add OAuth2 login flow with Google and GitHub providers.",
  "assignee": {
    "gid": "1208574839260002",
    "name": "Bob Smith",
    "resource_type": "user"
  },
  "created_at": "2024-06-14T09:00:00.000Z",
  "modified_at": "2024-06-15T15:00:00.000Z"
}
```

## System story (non-comment)

These should be filtered out (type !== "comment"):

```json
{
  "gid": "1208574839265126",
  "resource_type": "story",
  "type": "system",
  "text": "Alice Johnson moved this task to In Progress",
  "created_at": "2024-06-15T14:00:00.000Z",
  "created_by": {
    "gid": "1208574839260001",
    "name": "Alice Johnson",
    "resource_type": "user"
  },
  "target": {
    "gid": "1208574839265000",
    "resource_type": "task"
  }
}
```
