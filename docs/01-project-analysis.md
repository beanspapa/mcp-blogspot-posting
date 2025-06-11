# MCP 서버 보일러플레이트 프로젝트 분석

## 📋 프로젝트 개요

**목표**: MCP (Model Context Protocol) 서버 개발을 위한 재사용 가능한 보일러플레이트 코드 생성

**참고 자료**:

- 기존 프로젝트: `mcp-google-news-rss`
- MCP 스펙: `modelcontextprotocol-main/docs/specification/2025-03-26`
- TypeScript SDK: `typescript-sdk-main`

## 🔍 기존 프로젝트 분석 결과

### 1. 프로젝트 구조 (mcp-google-news-rss)

```
mcp-google-news-rss/
├── src/
│   ├── server.ts           # 메인 서버 클래스
│   ├── core/               # 핵심 로직
│   ├── impl/               # 구현체 (ServerToolManager)
│   ├── services/           # 비즈니스 로직 (NewsRssService)
│   ├── types/              # 타입 정의
│   └── extractors/         # 데이터 추출 로직
├── test/                   # 테스트 파일들
├── dist/                   # 빌드 결과물
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

### 2. 핵심 의존성

```json
{
  "@modelcontextprotocol/sdk": "^1.12.0",
  "zod": "^3.25.32",
  "mcps-logger": "^1.0.0"
}
```

### 3. 주요 아키텍처 패턴

#### A. 메인 서버 클래스 (`NewsRssMCPServer`)

- MCP SDK의 `Server` 클래스를 래핑
- 초기화와 실행을 분리 (`initialize()` → `run()`)
- 에러 핸들링과 graceful shutdown 구현
- JSON-RPC 호환성을 위한 로깅 처리

#### B. 툴 관리자 패턴 (`ServerToolManager`)

- 툴 등록과 실행을 담당
- 비즈니스 로직과 MCP 프로토콜 분리
- `listTools()`, `executeTool()` 메서드 제공

#### C. 서비스 레이어 (`NewsRssService`)

- 실제 비즈니스 로직 구현
- 외부 API 호출 및 데이터 처리
- 툴 관리자에서 호출되는 구조

### 4. MCP 프로토콜 핵심 요소

#### A. 서버 기본 정보

```typescript
{
  name: "server-name",
  version: "1.0.0",
  capabilities: {
    tools: {}
  }
}
```

#### B. 필수 핸들러

- `server/info`: 서버 정보 반환
- `tools/list`: 사용 가능한 툴 목록
- `tools/call`: 툴 실행

#### C. 전송 방식

- `StdioServerTransport`: 표준 입출력 기반
- JSON-RPC 2.0 프로토콜 사용

## 🎯 MCP SDK 주요 기능 분석

### 1. 서버 생성 방식 (TypeScript SDK)

```typescript
// 고수준 API
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// 툴 등록
server.tool("toolName", schema, handler);

// 리소스 등록
server.resource("resourceName", uri, handler);

// 프롬프트 등록
server.prompt("promptName", schema, handler);
```

### 2. 지원 기능

- **Tools**: 함수 실행 (POST 엔드포인트와 유사)
- **Resources**: 데이터 제공 (GET 엔드포인트와 유사)
- **Prompts**: 템플릿 메시지 패턴
- **Sampling**: 서버 주도 LLM 상호작용

### 3. 전송 방식

- **stdio**: 명령줄 도구 및 직접 통합
- **HTTP**: 웹 기반 통합

## 📊 보일러플레이트 요구사항 분석

### 1. 필수 구성 요소

- [x] 기본 프로젝트 구조
- [x] TypeScript 설정
- [x] MCP SDK 통합
- [x] 로깅 시스템 (mcps-logger)
- [x] 에러 핸들링
- [x] 테스트 환경

### 2. 아키텍처 패턴

- [x] 레이어드 아키텍처 (Server → Manager → Service)
- [x] 의존성 주입 패턴
- [x] 팩토리 패턴 (툴/리소스 생성)
- [x] 템플릿 메서드 패턴 (공통 로직 추상화)

### 3. 개발 편의성

- [x] 핫 리로드 개발 환경
- [x] 다양한 테스트 스크립트
- [x] CLI 테스트 도구
- [x] 타입 안전성 보장

### 4. 확장성

- [x] 플러그인 아키텍처
- [x] 설정 기반 툴 등록
- [x] 미들웨어 지원
- [x] 다중 서비스 지원

## 🚀 다음 단계

1. **프로젝트 구조 설계** → `02-project-structure.md`
2. **핵심 컴포넌트 설계** → `03-core-components.md`
3. **구현 계획 수립** → `04-implementation-plan.md`
4. **보일러플레이트 코드 생성** → 실제 구현
5. **테스트 및 문서화** → 완성도 검증
