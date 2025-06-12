import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import BloggerService from "./services/bloggerService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// MCP Tool 핸들러 등 필요한 의존성 import
import { TokenManager } from "./lib/tokenManager.js";
import GoogleAuth from "./lib/googleAuth.js";
import { z } from "zod";
import { runGoogleAuthFlow } from "./lib/googleAuthFlow.js";

// MCP 서버 인스턴스 생성
const server = new Server(
  {
    name: "blogspot-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// MCP Tool 핸들러 등록 함수와 분리된 초기화 함수
async function ensureValidToken(googleAuth: any) {
  let tokens = TokenManager.loadTokens();
  if (!tokens || !tokens.access_token) {
    // 토큰 없음 → 인증 플로우
    console.log("Google 인증이 필요합니다. 브라우저에서 인증을 진행합니다...");
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
          const { credentials } = await googleAuth.getAuthClient().refreshAccessToken();
          TokenManager.saveTokens(credentials);
          tokens = credentials;
          console.log("access_token이 갱신되었습니다.");
        } catch (e) {
          // refresh_token도 만료/폐기 → 인증 플로우 재실행
          console.log("refresh_token 만료/폐기. 브라우저 인증 재실행...");
          await runGoogleAuthFlow(googleAuth);
          tokens = TokenManager.loadTokens();
          if (!tokens || !tokens.access_token) {
            throw new Error("인증 플로우 실패: 토큰을 받을 수 없습니다.");
          }
        }
      } else {
        // refresh_token 없음 → 인증 플로우 재실행
        console.log("refresh_token 없음. 브라우저 인증 재실행...");
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
    console.error("BLOG_URL 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }
  if (!credentialPath) {
    console.error("GOOGLE_CLIENT_SECRET_PATH 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }
  // credentials 로딩
  const credentials = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
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
      fs.writeFileSync(BLOG_ID_CACHE_PATH, JSON.stringify({ blogUrl, blogId }, null, 2));
    } catch (e: any) {
      console.error("블로그 주소로 블로그 ID를 조회할 수 없습니다: " + e.message);
      process.exit(1);
    }
  }
  
  return { bloggerService, blogId, googleAuth };
}

// MCP Tool 등록 함수
async function registerTools({ bloggerService, blogId, googleAuth }: { bloggerService: any; blogId: string; googleAuth: any }) {
  server.setRequestHandler(
    z.object({ method: z.literal("tools/call"), params: z.object({ name: z.string(), arguments: z.any() }) }),
    async (request) => {
      const { name, arguments: args } = request.params;
      if (name === "blog-post") {
        try {
          const postData = {
            title: args.title,
            content: args.content,
            labels: args.labels,
            isDraft: args.isDraft === undefined ? true : args.isDraft,
          };
          const result = await bloggerService.createPost(blogId, postData);
          return {
            content: [
              {
                type: "text",
                text: `포스트 작성 성공!\nURL: ${result.url}\n제목: ${result.title}`,
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          return {
            content: [
              { type: "text", text: `포스트 작성 실패: ${error.message}` },
            ],
            isError: true,
          };
        }
      } else if (name === "blog-batch-post") {
        try {
          const posts = (args.posts as any[]).map((p) => ({
            ...p,
            isDraft: p.isDraft === undefined ? true : p.isDraft,
          }));
          const results = await bloggerService.batchCreatePosts(blogId, posts);
          const successCount = results.filter((r: any) => r.success).length;
          const failCount = results.length - successCount;
          return {
            content: [
              {
                type: "text",
                text: `배치 포스팅 완료! 성공: ${successCount}, 실패: ${failCount}`,
              },
              { type: "text", text: JSON.stringify(results, null, 2) },
            ],
            isError: failCount > 0,
          };
        } catch (error: any) {
          return {
            content: [
              { type: "text", text: `배치 포스팅 실패: ${error.message}` },
            ],
            isError: true,
          };
        }
      }
      return { content: [{ type: "text", text: "지원하지 않는 Tool" }], isError: true };
    }
  );
}

async function main() {
  const { bloggerService, blogId, googleAuth } = await prepareBloggerService();
  await registerTools({ bloggerService, blogId, googleAuth });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
