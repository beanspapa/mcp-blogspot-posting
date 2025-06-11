# MCP Blogger Posting Server (MCP 블로그 포스팅 서버)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Google Blogger API와 MCP(Model Context Protocol) Tool을 결합한 실전형 블로그 포스팅 자동화 서버**

---

## ✨ 주요 기능

- **Google Blogger API 연동**: MCP Tool로 블로그 포스팅/배치포스팅 자동화
- **MCP Tool 표준 지원**: LLM/MCP 클라이언트에서 blog-post, blog-batch-post Tool 호출 가능
- **환경변수 기반 보안/설정**: .env, client_secret 파일, 인증 토큰 안전 관리
- **테스트/운영/확장성**: 유닛/통합 테스트, 환경별 설정, 보안 가이드 제공
- **경량화된 구조**: 불필요한 리소스/프롬프트/예제 코드 제거, Tool 중심의 순수 MCP 서버
- **파라미터 기반 config**: credentialPath, blogId 등 환경변수/파라미터로 유연하게 설정

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
  "blogId": "블로그ID",
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
│   ├── core/           # MCP 서버 추상화 (BaseServer 등)
│   ├── managers/       # Tool 핸들러
│   ├── services/       # BloggerService 등 비즈니스 로직
│   ├── types/          # 타입 정의 (bloggerTypes 등)
│   ├── lib/            # 인증/토큰 관리 등
│   └── config.ts       # 환경설정, client_secret 경로 등
├── test/               # 유닛/통합 테스트
├── .env                # 환경변수 (gitignore 필수)
├── client_secret_*.json # Google OAuth2 시크릿 (gitignore 필수)
├── .gitignore
├── package.json
└── README.md
```

---

## 🛡️ 보안/운영 주의사항

- `.env`, `client_secret*.json` 등 민감 파일은 반드시 .gitignore에 추가
- 인증 토큰(.blogger-tokens.json 등)도 git에 커밋 금지
- 운영 환경에서는 환경변수/시크릿 파일을 안전하게 관리
- 테스트/운영 시 .env를 명시적으로 로드, 환경변수 미설정 시 에러 throw로 실수 방지

---

## 🧪 테스트

- `npm test`로 유닛 테스트 실행
- 통합 테스트는 .env/환경변수/실제 blogId 등 실데이터 주입 필요
- MCP Tool 정상 동작, 인증 실패/성공 케이스 자동 검증

---

## 📝 추가 참고

- MCP Inspector 등으로 Tool 목록/호출 테스트 권장
- 인증/토큰 발급은 Google OAuth2 공식 가이드 참고
- Tool/서비스 확장 시 managers/services 구조 활용
- BaseServer 구조 개선으로 불필요한 리소스/프롬프트/예제 코드 없이 경량화 가능

---

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.
