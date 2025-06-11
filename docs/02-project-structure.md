# MCP 서버 보일러플레이트 프로젝트 구조 설계

## 📁 디렉토리 구조

```
mcp-server-boilerplate/
├── 📁 src/
│   ├── 📄 server.ts                    # 메인 서버 엔트리포인트
│   ├── 📁 core/
│   │   ├── 📄 base-server.ts           # 추상 서버 기본 클래스
│   │   ├── 📄 server-config.ts         # 서버 설정 인터페이스
│   │   └── 📄 lifecycle.ts             # 서버 생명주기 관리
│   ├── 📁 managers/
│   │   ├── 📄 tool-manager.ts          # 툴 관리자
│   │   ├── 📄 resource-manager.ts      # 리소스 관리자
│   │   └── 📄 prompt-manager.ts        # 프롬프트 관리자
│   ├── 📁 services/
│   │   ├── 📄 base-service.ts          # 서비스 기본 클래스
│   │   └── 📄 example-service.ts       # 예제 서비스 구현
│   ├── 📁 types/
│   │   ├── 📄 index.ts                 # 공통 타입 정의
│   │   ├── 📄 server.ts                # 서버 관련 타입
│   │   ├── 📄 tool.ts                  # 툴 관련 타입
│   │   ├── 📄 resource.ts              # 리소스 관련 타입
│   │   └── 📄 config.ts                # 설정 관련 타입
│   ├── 📁 utils/
│   │   ├── 📄 logger.ts                # 로깅 유틸리티
│   │   ├── 📄 validation.ts            # 검증 유틸리티
│   │   └── 📄 error-handler.ts         # 에러 처리 유틸리티
│   └── 📁 examples/
│       ├── 📄 calculator-tool.ts       # 계산기 툴 예제
│       ├── 📄 file-resource.ts         # 파일 리소스 예제
│       └── 📄 greeting-prompt.ts       # 인사 프롬프트 예제
├── 📁 test/
│   ├── 📄 server.test.ts               # 서버 테스트
│   ├── 📄 tool-manager.test.ts         # 툴 매니저 테스트
│   ├── 📄 cli-test.ts                  # CLI 테스트 도구
│   └── 📁 fixtures/                    # 테스트 데이터
├── 📁 docs/
│   ├── 📄 README.md                    # 메인 문서
│   ├── 📄 GETTING_STARTED.md           # 시작 가이드
│   ├── 📄 API_REFERENCE.md             # API 레퍼런스
│   └── 📄 EXAMPLES.md                  # 사용 예제
├── 📁 templates/
│   ├── 📄 new-tool.template.ts         # 새 툴 템플릿
│   ├── 📄 new-service.template.ts      # 새 서비스 템플릿
│   └── 📄 new-resource.template.ts     # 새 리소스 템플릿
├── 📁 scripts/
│   ├── 📄 generate-tool.js             # 툴 생성 스크립트
│   ├── 📄 generate-service.js          # 서비스 생성 스크립트
│   └── 📄 dev-setup.js                 # 개발 환경 설정
├── 📄 package.json                     # 패키지 설정
├── 📄 tsconfig.json                    # TypeScript 설정
├── 📄 .gitignore                       # Git 무시 파일
├── 📄 .env.example                     # 환경변수 예제
└── 📄 LICENSE                          # 라이선스
```

## 🏗️ 아키텍처 레이어

### 1. 프레젠테이션 레이어 (Presentation Layer)

```
📄 server.ts
└── 역할: MCP 클라이언트와의 통신 담당
└── 책임: JSON-RPC 메시지 처리, 프로토콜 준수
```

### 2. 관리 레이어 (Management Layer)

```
📁 managers/
├── 📄 tool-manager.ts      # 툴 등록/실행 관리
├── 📄 resource-manager.ts  # 리소스 등록/제공 관리
└── 📄 prompt-manager.ts    # 프롬프트 등록/실행 관리
```

### 3. 비즈니스 레이어 (Business Layer)

```
📁 services/
├── 📄 base-service.ts      # 공통 서비스 로직
└── 📄 example-service.ts   # 구체적인 비즈니스 로직
```

### 4. 인프라 레이어 (Infrastructure Layer)

```
📁 utils/
├── 📄 logger.ts           # 로깅
├── 📄 validation.ts       # 데이터 검증
└── 📄 error-handler.ts    # 에러 처리
```

## 🔧 핵심 컴포넌트 설계

### 1. BaseServer (추상 클래스)

```typescript
abstract class BaseServer {
  // 공통 초기화 로직
  abstract initialize(): Promise<void>;

  // 공통 실행 로직
  async run(): Promise<void>;

  // 공통 종료 로직
  async shutdown(): Promise<void>;
}
```

### 2. Manager 패턴

```typescript
interface IManager<T> {
  register(item: T): void;
  unregister(name: string): void;
  list(): T[];
  execute(name: string, params: any): Promise<any>;
}
```

### 3. Service 패턴

```typescript
abstract class BaseService {
  abstract getName(): string;
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
}
```

## 📦 패키지 구조

### 1. 의존성 분류

#### 핵심 의존성 (Core Dependencies)

```json
{
  "@modelcontextprotocol/sdk": "^1.12.0",
  "zod": "^3.25.32"
}
```

#### 로깅 및 개발 도구

```json
{
  "mcps-logger": "^1.0.0"
}
```

#### 개발 의존성 (Dev Dependencies)

```json
{
  "@types/node": "^22.15.23",
  "typescript": "^5.8.3",
  "ts-node": "^10.9.2",
  "jest": "^29.0.0",
  "@types/jest": "^29.0.0"
}
```

### 2. 스크립트 구성

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "node --loader ts-node/esm src/server.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "cli": "node --loader ts-node/esm test/cli-test.ts",
    "generate:tool": "node scripts/generate-tool.js",
    "generate:service": "node scripts/generate-service.js"
  }
}
```

## 🎯 설계 원칙

### 1. 단일 책임 원칙 (SRP)

- 각 클래스와 모듈은 하나의 명확한 책임만 가짐
- Manager는 등록/관리만, Service는 비즈니스 로직만

### 2. 개방-폐쇄 원칙 (OCP)

- 새로운 툴/서비스 추가 시 기존 코드 수정 없이 확장 가능
- 추상 클래스와 인터페이스를 통한 확장성 보장

### 3. 의존성 역전 원칙 (DIP)

- 고수준 모듈이 저수준 모듈에 의존하지 않음
- 추상화에 의존하여 결합도 최소화

### 4. 인터페이스 분리 원칙 (ISP)

- 클라이언트가 사용하지 않는 인터페이스에 의존하지 않음
- 작고 구체적인 인터페이스 제공

## 🔄 확장 가능성

### 1. 플러그인 아키텍처

```typescript
interface IPlugin {
  name: string;
  version: string;
  initialize(server: BaseServer): Promise<void>;
  cleanup(): Promise<void>;
}
```

### 2. 미들웨어 지원

```typescript
interface IMiddleware {
  before?(context: any): Promise<any>;
  after?(context: any, result: any): Promise<any>;
  error?(context: any, error: Error): Promise<any>;
}
```

### 3. 설정 기반 확장

```typescript
interface ServerConfig {
  tools: ToolConfig[];
  resources: ResourceConfig[];
  prompts: PromptConfig[];
  middleware: MiddlewareConfig[];
}
```

## 📋 다음 단계

1. **핵심 컴포넌트 상세 설계** → `03-core-components.md`
2. **구현 계획 및 우선순위** → `04-implementation-plan.md`
3. **코드 생성 및 구현** → 실제 파일 생성
4. **테스트 및 검증** → 동작 확인
5. **문서화 완성** → 사용 가이드 작성
