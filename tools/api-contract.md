# FAB API Contract

This document outlines the core endpoints for the FAB fullstack application.

## Authentication

### GitHub Login
**GET** `/auth/github/login`
- **Response**: `{ "url": "https://github.com/login/oauth/authorize?..." }`

### GitHub Exchange
**POST** `/auth/github/exchange`
- **Request**: `{ "code": "GITHUB_CODE" }`
- **Response**: `{ "username": "string", "token": "string" }`

---

### GitHub Analysis

### List Repositories
**POST** `/github/repos`
- **Request**: `{ "username": "string", "token": "string" }`
- **Response**: 
```json
{
  "username": "string",
  "repoCount": number,
  "repos": [
    { "name": "string", "description": "string", "url": "string" }
  ]
}
```

---

### Resume Verification

### Verify Resume File
**POST** `/verify-resume-file` (Multipart/form-data)
- **Request**: `resume` (file), `username` (string)
- **Response**:
```json
{
  "username": "string",
  "claimsFound": number,
  "verification": [],
  "summary": { "honestyScore": number },
  "resumeBio": "string",
  "projects": []
}
```

---

### Interview Session

### Start Interview
**POST** `/interview/start`
- **Request**: 
```json
{
  "username": "string",
  "brainType": "local" | "remote",
  "context": {
    "skills": ["string"],
    "projects": []
  }
}
```
- **Response**: `{ "sessionId": "string", "firstQuestion": "string" }`

### Submit Answer
**POST** `/interview/answer`
- **Request**: `{ "sessionId": "string", "answer": "string" }`
- **Response**:
```json
{
  "feedback": "string",
  "score": number,
  "satisfaction": number,
  "nextQuestion": { "text": "string" },
  "done": boolean
}
```

---

### Progress & Profile

### Get Progress
**GET** `/progress/:username`
- **Response**: `{ "username": "string", "history": [], "stats": {} }`

### Get Profile
**GET** `/profile/:username`
- **Response**: `{ "username": "string", "bio": "string", "skills": {} }`
