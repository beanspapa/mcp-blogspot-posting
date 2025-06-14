# MCP Blogger Posting Server (MCP 블로그 포스팅 서버)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Google Blogger API와 MCP(Model Context Protocol) Tool을 결합한 실전형 블로그 포스팅 자동화 서버**

---

## 🆕 주요 업데이트 (2025-06-14)

- **server/info 엔드포인트 지원:** MCP Inspector/클라이언트에서 `server/info` 요청으로 서버 이름/버전 정보를 직접 조회할 수 있습니다.
- **로깅 정책 강화:** MCP 서버의 모든 로그는 반드시 stderr(console.error) 또는 MCP 프로토콜 전용 로깅 함수만 사용해야 하며, stdout 오염 시 프로토콜 파싱 에러가 발생할 수 있습니다.
- **실시간 JSON 송신 추적:** `[DEBUG][STDIO_SEND] ...` 형태의 stderr 로그로 실제 송신되는 JSON 메시지를 실시간으로 추적할 수 있습니다.

---

## ✨ 주요 기능

- **Google Blogger API 연동**: MCP Tool로 블로그 포스팅/배치포스팅 자동화
- **MCP Tool 표준 지원**: LLM/MCP 클라이언트에서 blog-post, blog-batch-post Tool 호출 가능
- **환경변수 기반 보안/설정**: .env, client_secret 파일, 인증 토큰 안전 관리
- **테스트/운영/확장성**: 유닛/통합 테스트, 환경별 설정, 보안 가이드 제공
- **경량화된 구조**: 불필요한 리소스/프롬프트/예제 코드 제거, Tool 중심의 순수 MCP 서버
- **파라미터 기반 config**: credentialPath, blogUrl 등 환경변수/파라미터로 유연하게 설정
- **서버 정보 엔드포인트(server/info) 제공:** MCP Inspector/클라이언트에서 `server/info` 요청으로 서버 이름/버전 정보를 직접 조회 가능

---

## 🚀 빠른 시작

### 1. 필수 파일 준비

- `.env` 파일(환경변수)
- Google OAuth2 client_secret JSON 파일(경로는 환경변수로 지정)
- `.gitignore`에 `.env`, `client_secret*.json` 반드시 포함

### 2. 환경변수 예시(.env)

```
GOOGLE_CLIENT_SECRET_PATH=C:/dev/mcp-servers/mcp-blogspot-posting/client_secret_...json
SESSION_SECRET=your-session-secret
BLOG_ID=your-blog-id (선택)
PORT=3000
```

### 3. 의존성 설치 및 빌드

```
npm install
npm run build
```

### 4. 서버 실행

```
npm run dev
```

### 5. MCP Tool 사용 예시

- MCP Inspector/클라이언트에서 blog-post, blog-batch-post Tool 확인 및 호출
- 입력 예시:

```json
{
  "title": "테스트 포스트",
  "content": "<h1>내용</h1>",
  "labels": ["테스트", "자동화"],
  "isDraft": false
}
```

- 인증 토큰이 없으면 에러, 인증 후 정상 포스팅

---

## 📂 주요 구조

```
mcp-blogspot-posting/
├── src/
│   ├── managers/       # Tool 핸들러
│   ├── services/       # BloggerService 등 비즈니스 로직
│   ├── types/          # 타입 정의 (bloggerTypes 등)
│   ├── lib/            # 인증/토큰 관리 등
├── test/               # 유닛/통합 테스트
├── .env                # 환경변수 (gitignore 필수)
├── client_secret_*.json # Google OAuth2 시크릿 (gitignore 필수)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚦 서버 시작 및 블로그 ID 관리 정책

1. **서버 시작 시**

   - 환경변수 `BLOG_URL`(필수)로 블로그 주소를 전달받습니다.
   - Google 인증 토큰을 체크(없거나 만료 시 인증, 실패 시 서버 시작 중단)
   - 블로그 주소로 Google Blogger API를 통해 블로그 ID를 조회합니다.
   - 조회 성공 시, **블로그 ID를 `.blog_id_cache.json` 파일에 저장**합니다.
   - 조회 실패(네트워크, 인증, 주소 오류 등) 시 MCP 에러로 서버 시작이 중단됩니다.

2. **API 호출 시**

   - 항상 캐시된 블로그 ID(`.blog_id_cache.json`)를 사용해 API를 호출합니다.
   - **API 호출 중 블로그 ID 관련 에러(404/403 등) 발생 시**
     - 블로그 주소로 블로그 ID를 1회 재조회(재시도)
     - 재조회 성공 시, ID를 갱신하여 다시 API 호출
     - 재조회 실패 시 에러 반환

3. **운영/보안 주의사항**
   - `.blog_id_cache.json` 파일은 반드시 .gitignore에 추가해 git에 커밋하지 마세요.
   - 캐시 파일 포맷 예시: `{ "blogUrl": "https://yourblog.blogspot.com", "blogId": "1234567890" }`
   - 서버 재시작 시 캐시 파일이 있으면 우선 사용, 없으면 새로 조회
   - 네트워크/인증/주소 오류 등으로 블로그 ID를 조회할 수 없으면 서버가 시작되지 않습니다.

---

## 🧪 테스트

- `npm test`로 유닛 테스트 실행
- 통합 테스트는 .env/환경변수/실제 blogUrl 등 실데이터 주입 필요
- MCP Tool 정상 동작, 인증 실패/성공 케이스 자동 검증

---

## 📝 추가 참고

- MCP Inspector 등으로 Tool 목록/호출 테스트 권장
- 인증/토큰 발급은 Google OAuth2 공식 가이드 참고
- Tool/서비스 확장 시 managers/services 구조 활용
- BaseServer 구조 개선으로 불필요한 리소스/프롬프트/예제 코드 없이 경량화 가능

---

## 🛠️ MCP Tool 입력/출력 포맷 및 예시

### blog-post Tool

- **설명:** Google Blogger에 단일 포스트를 작성합니다.
- **입력(JSON):**

```jsonc
{
  "title": "포스트 제목", // (필수)
  "content": "<h1>포스트 내용(HTML)</h1>", // (필수)
  "labels": ["라벨1", "라벨2"], // (선택)
  "isDraft": true, // (선택, 기본값: true)
}
```

- **입력 필드 설명:**
  | 필드명 | 타입 | 필수 | 설명 |
  |----------|-----------|------|---------------------|
  | title | string | ✅ | 포스트 제목 |
  | content | string | ✅ | 포스트 내용(HTML) |
  | labels | string[] | — | 라벨 목록 |
  | isDraft | boolean | — | 초안 여부(true/false, 기본값: true)|
- **비고:** 블로그 ID는 서버 환경변수(BLOG_ID)로 관리되며, 사용자가 입력할 필요가 없습니다.

- **출력(JSON):**

```json
{
  "content": [
    { "type": "text", "text": "포스트 작성 성공!\nURL: https://...\n제목: ..." }
  ],
  "isError": false
}
```

- **출력 필드 설명:**
  | 필드명 | 타입 | 설명 |
  |----------|-----------|--------------------------------------|
  | content | array | 메시지(성공/실패/상세정보) |
  | isError | boolean | 실패 여부(true: 에러, false: 성공) |

- **에러 예시:**

```json
{
  "content": [
    { "type": "text", "text": "인증 토큰이 없습니다. 먼저 인증을 완료하세요." }
  ],
  "isError": true
}
```

---

### blog-batch-post Tool

- **설명:** 여러 포스트를 한 번에 작성합니다.
- **입력(JSON):**

```jsonc
{
  "posts": [
    // (필수)
    {
      "title": "제목1", // (필수)
      "content": "<h1>내용1</h1>", // (필수)
      "labels": ["라벨A"], // (선택)
      "isDraft": true, // (선택, 기본값: true)
    },
    {
      "title": "제목2", // (필수)
      "content": "<h1>내용2</h1>", // (필수)
    },
  ],
}
```

- **입력 필드 설명:**
  | 필드명 | 타입 | 필수 | 설명 |
  |----------|-----------|------|---------------------|
  | posts | object[] | ✅ | 포스트 배열 |
  | └ title | string | ✅ | 포스트 제목 |
  | └ content| string | ✅ | 포스트 내용(HTML) |
  | └ labels | string[] | — | 라벨 목록 |
  | └ isDraft| boolean | — | 초안 여부(true/false, 기본값: true)|
- **비고:** 블로그 ID는 서버 환경변수(BLOG_ID)로 관리되며, 사용자가 입력할 필요가 없습니다.

- **출력(JSON):**

```json
{
  "content": [
    { "type": "text", "text": "배치 포스팅 완료! 성공: 2, 실패: 0" },
    { "type": "text", "text": "[ {\"success\":true,\"postId\":\"...\",...} ]" }
  ],
  "isError": false
}
```

- **출력 필드 설명:**
  | 필드명 | 타입 | 설명 |
  |----------|-----------|--------------------------------------|
  | content | array | 메시지(성공/실패/상세정보) |
  | isError | boolean | 실패 여부(true: 에러, false: 성공) |

- **에러 예시:**

```json
{
  "content": [
    { "type": "text", "text": "인증 토큰이 없습니다. 먼저 인증을 완료하세요." }
  ],
  "isError": true
}
```

---

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.

---

## ⚙️ 클라이언트에서 MCP 서버 설정 예시

MCP 클라이언트(예: MCP Inspector, 통합 MCP 플랫폼 등)에서 blogspot-posting 서버를 실행할 때는 아래와 같이 `mcpServers` 설정을 사용합니다.

```jsonc
{
  "mcpServers": {
    "blogspot-posting": {
      "command": "npx",
      "args": ["-y", "server-blogspot-posting"],
      "env": {
        "GOOGLE_CLIENT_SECRET_PATH": "/path/to/client_secret_xxx.json",
        "BLOG_ID": "your-blog-id",
      },
    },
  },
}
```

- `command`, `args`: MCP 서버 실행 명령 및 인자
- `env`: 서버에 주입할 환경변수(시크릿 경로)
- 필요에 따라 추가 환경변수(.env에 있는 값)를 모두 env에 명시 가능

> **NOTE:** 현재 버전에서는 SESSION_SECRET은 필요하지 않습니다. (세션 기반 인증/로그인 기능이 추가될 경우에만 필요)

---

## ⚠️ blogId 캐시 파일(.blog_id_cache.json) 경로 정책 및 주의사항

- 블로그 ID 캐시 파일(.blog_id_cache.json)은 **항상 프로젝트 루트(최상위 폴더)에만 생성**됩니다.
- 빌드(dist) 폴더 등 다른 위치에 캐시 파일이 생성되는 문제를 2025-06-12에 수정하였으며, 이제 어떤 환경에서 실행해도 루트에만 생성됩니다.
- dist/.blog_id_cache.json 등 잘못된 위치의 캐시 파일이 있다면 수동으로 삭제하세요.
- 반드시 .gitignore에 .blog_id_cache.json을 포함해 git에 커밋되지 않도록 하세요.
- 서버 실행/빌드 위치와 무관하게 캐시 파일이 루트에만 생성되는지 운영/테스트 환경에서 확인하세요.

---

## 🧑‍💻 디버깅/운영 가이드

- MCP 서버의 모든 로그는 반드시 stderr(console.error) 또는 MCP 프로토콜 전용 로깅 함수만 사용해야 하며, stdout 오염 시 프로토콜 파싱 에러가 발생할 수 있습니다.
- `[DEBUG][STDIO_SEND] ...` stderr 로그를 통해 실제 송신되는 JSON 메시지를 실시간으로 추적하여, 파싱 에러 및 프로토콜 문제를 신속하게 진단할 수 있습니다.
- Inspector/클라이언트에서 `server/info`로 서버 정보 조회 및 tools/list 등 정상 동작을 확인하세요.

---

## 🚦 MCP Tool/서버 엔드포인트 예시

- **서버 정보 조회(server/info):**
  ```json
  { "method": "server/info" }
  ```
  → 응답 예시:
  ```json
  { "name": "blogspot-mcp-server", "version": "1.0.0" }
  ```
