import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ToolManager } from "../src/managers/tool-manager.js";
import { TokenManager } from "../src/lib/tokenManager.js";
import fs from "fs";
import path from "path";
process.env.BLOG_URL = "https://dummy-blog.blogspot.com";
// BloggerService mock (blogId는 임의값)
const mockBloggerService = {
  getBlogByUrl: async (url: string) => ({ id: "dummy-blog-id" })
};

describe("Blogger MCP Tools", () => {
  let toolManager: ToolManager;

  beforeAll(async () => {
    toolManager = new ToolManager();
    const port = 3000;
    const credentialPath = process.env.GOOGLE_CLIENT_SECRET_PATH;
    const blogUrl = process.env.BLOG_URL;
    if (!blogUrl) throw new Error("BLOG_URL 환경변수가 필요합니다.");
    if (!credentialPath) throw new Error("GOOGLE_CLIENT_SECRET_PATH 환경변수가 필요합니다.");
    const credentials = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
    const GoogleAuth = (await import("../src/lib/googleAuth.js")).default;
    const googleAuth = new GoogleAuth({
      clientId: credentials.web.client_id,
      clientSecret: credentials.web.client_secret,
      scopes: ["https://www.googleapis.com/auth/blogger"],
      redirectUri: process.env.REDIRECT_URI || `http://localhost:${port}/auth/google/callback`,
    });
    // blogId 캐시 경로
    const BLOG_ID_CACHE_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "../.blog_id_cache.json");
    let blogId: string | null = null;
    if (fs.existsSync(BLOG_ID_CACHE_PATH)) {
      try {
        const cache = JSON.parse(fs.readFileSync(BLOG_ID_CACHE_PATH, "utf8"));
        if (cache.blogUrl === blogUrl && cache.blogId) {
          blogId = cache.blogId;
        }
      } catch (e) {}
    }
    if (!blogId) {
      const BloggerService = (await import("../src/services/bloggerService.js")).default;
      const bloggerService = new BloggerService(googleAuth.getAuthClient());
      const info = await bloggerService.getBlogByUrl(blogUrl);
      if (!info || !info.id) throw new Error("블로그 ID 조회 실패");
      blogId = info.id;
      fs.writeFileSync(BLOG_ID_CACHE_PATH, JSON.stringify({ blogUrl, blogId }, null, 2));
    }
    toolManager.registerBloggerTools({
      bloggerService: mockBloggerService,
      blogId,
      googleAuth,
    });
  });

  afterEach(() => {
    // 테스트 후 토큰 정리
    TokenManager.clearTokens();
  });

  it("blog-post: 인증 토큰이 없으면 에러를 반환해야 한다", async () => {
    TokenManager.clearTokens();
    const result = await toolManager.callTool("blog-post", {
      title: "테스트 포스트",
      content: "테스트 내용",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("인증 토큰이 없습니다");
  });

  it("blog-batch-post: 인증 토큰이 없으면 에러를 반환해야 한다", async () => {
    TokenManager.clearTokens();
    const result = await toolManager.callTool("blog-batch-post", {
      posts: [
        { title: "포스트1", content: "내용1" },
        { title: "포스트2", content: "내용2", isDraft: true },
      ],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("인증 토큰이 없습니다");
  });

  // 실제 토큰이 있을 때의 성공 케이스는 별도 mock 또는 테스트 블로그 계정으로 추가 가능
  // it('blog-post: 정상 입력 시 성공적으로 포스팅해야 한다', async () => { ... });
});
