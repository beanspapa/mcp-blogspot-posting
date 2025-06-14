import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import BloggerService from "./services/bloggerService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logInfo, logWarning, logError } from "./utils/logger.js";

// MCP Tool 핸들러 등 필요한 의존성 import
import { TokenManager } from "./lib/tokenManager.js";
import GoogleAuth from "./lib/googleAuth.js";
import { z } from "zod";
import { runGoogleAuthFlow } from "./lib/googleAuthFlow.js";
import { ToolManager } from "./managers/tool-manager.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { setLoggerServer } from "./utils/logger.js";

// MCP 서버 인스턴스 생성
const server = new Server(
  {
    name: "blogspot-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// === server/info 핸들러 등록 ===
const ServerInfoRequestSchema = z.object({
  method: z.literal("server/info"),
});
server.setRequestHandler(ServerInfoRequestSchema, async () => {
  return {
    name: "blogspot-mcp-server",
    version: "1.0.0",
  };
});
// === end server/info ===

// MCP Tool 핸들러 등록 함수와 분리된 초기화 함수
async function ensureValidToken(googleAuth: any) {
  let tokens = TokenManager.loadTokens();
  if (!tokens || !tokens.access_token) {
    // 토큰 없음 → 인증 플로우
    logInfo("Google 인증이 필요합니다. 브라우저에서 인증을 진행합니다...");
    await runGoogleAuthFlow(googleAuth);
    tokens = TokenManager.loadTokens();
    if (!tokens || !tokens.access_token) {
      throw new Error("인증 플로우 실패: 토큰을 받을 수 없습니다.");
    }
  } else {
    // 토큰이 있지만 만료되었는지 체크
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      if (tokens.refresh_token) {
        // refresh_token으로 갱신 시도
        try {
          googleAuth.setCredentials(tokens);
          const { credentials } = await googleAuth
            .getAuthClient()
            .refreshAccessToken();
          TokenManager.saveTokens(credentials);
          tokens = credentials;
          logInfo("access_token이 갱신되었습니다.");
        } catch (e) {
          // refresh_token도 만료/폐기 → 인증 플로우 재실행
          logWarning("refresh_token 만료/폐기. 브라우저 인증 재실행...");
          await runGoogleAuthFlow(googleAuth);
          tokens = TokenManager.loadTokens();
          if (!tokens || !tokens.access_token) {
            throw new Error("인증 플로우 실패: 토큰을 받을 수 없습니다.");
          }
        }
      } else {
        // refresh_token 없음 → 인증 플로우 재실행
        logWarning("refresh_token 없음. 브라우저 인증 재실행...");
        await runGoogleAuthFlow(googleAuth);
        tokens = TokenManager.loadTokens();
        if (!tokens || !tokens.access_token) {
          throw new Error("인증 플로우 실패: 토큰을 받을 수 없습니다.");
        }
      }
    }
  }
  googleAuth.setCredentials(tokens);
  return tokens;
}

async function prepareBloggerService() {
  const credentialPath = process.env.GOOGLE_CLIENT_SECRET_PATH;
  const blogUrl = process.env.BLOG_URL;
  if (!blogUrl) {
    logError("BLOG_URL 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }
  if (!credentialPath) {
    logError("GOOGLE_CLIENT_SECRET_PATH 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }
  // credentials 로딩 (존재 및 파싱 예외 처리)
  if (!fs.existsSync(credentialPath)) {
    logError(
      `\n[FATAL] 필수 파일 누락: ${credentialPath}\n` +
        "설명: Google API 인증을 위한 client_secret JSON 파일이 필요합니다. Google Cloud Console에서 OAuth 클라이언트 ID를 생성해 다운로드하세요.\n" +
        "- 파일이 존재하는지 확인하세요.\n" +
        "- 경로/파일명이 정확한지 확인하세요.\n" +
        "- 환경변수(GOOGLE_CLIENT_SECRET_PATH)로 경로를 지정할 수 있습니다.\n"
    );
    process.exit(1);
  }
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  } catch (e: any) {
    logError(
      `\n[FATAL] client_secret JSON 파싱 실패: ${credentialPath}\n` +
        "설명: JSON 파일이 올바른 형식인지 확인하세요.\n" +
        `에러: ${e.message}\n`
    );
    process.exit(1);
  }
  // GoogleAuth 인스턴스 생성 (redirectUri는 인증 시점에 동적으로 할당)
  const googleAuth = new GoogleAuth({
    clientId: credentials.web.client_id,
    clientSecret: credentials.web.client_secret,
    scopes: ["https://www.googleapis.com/auth/blogger"],
  });
  // 항상 유효한 토큰 확보
  await ensureValidToken(googleAuth);
  // blogId 캐시 경로 (항상 프로젝트 루트 기준)
  const BLOG_ID_CACHE_PATH = path.resolve(process.cwd(), ".blog_id_cache.json");
  let blogId: string | null = null;
  // blogId 캐시 우선
  if (fs.existsSync(BLOG_ID_CACHE_PATH)) {
    try {
      const cache = JSON.parse(fs.readFileSync(BLOG_ID_CACHE_PATH, "utf8"));
      if (cache.blogUrl === blogUrl && cache.blogId) {
        blogId = cache.blogId;
      }
    } catch (e) {}
  }
  const bloggerService = new BloggerService(googleAuth.getAuthClient());
  // 캐시 없으면 새로 조회 (항상 토큰 세팅 후 호출)
  if (!blogId) {
    try {
      const info = await bloggerService.getBlogByUrl(blogUrl);
      if (!info || !info.id) throw new Error("블로그 ID 조회 실패");
      blogId = info.id;
      fs.writeFileSync(
        BLOG_ID_CACHE_PATH,
        JSON.stringify({ blogUrl, blogId }, null, 2)
      );
    } catch (e: any) {
      logError(
        `\n[FATAL] 블로그 주소로 블로그 ID를 조회할 수 없습니다: ${e.message}\n` +
          "설명: 블로그 URL이 올바른지 확인하세요.\n" +
          "      블로그가 공개되어 있는지 확인하세요.\n" +
          "      블로그에 대한 접근 권한이 있는지 확인하세요.\n"
      );
      process.exit(1);
    }
  }

  return { bloggerService, blogId, googleAuth };
}

async function main() {
  const { bloggerService, blogId, googleAuth } = await prepareBloggerService();
  // ToolManager 인스턴스 생성 및 blogger tool 등록
  const toolManager = new ToolManager();
  toolManager.registerBloggerTools({ bloggerService, blogId, googleAuth });

  // MCP Tool 목록(list) 핸들러 등록
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return await toolManager.listTools();
  });

  // MCP Tool 실행(call) 핸들러 등록
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await toolManager.callTool(name, args);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  setLoggerServer(server);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    logError(
      `\n[FATAL] MCP 서버 실행 중 에러: ${err}\n` +
        "설명: 서버 실행 중 예상치 못한 오류가 발생했습니다.\n" +
        "      에러 로그를 확인하세요.\n"
    );
    process.exit(1);
  });
}
