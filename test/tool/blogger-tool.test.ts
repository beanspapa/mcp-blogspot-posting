import { ToolManager } from "../../src/managers/tool-manager.js";
import { TokenManager } from "../../src/lib/tokenManager.js";
import { z } from "zod";
import { createConfigWithPort } from "../../src/config.js";

describe("Blogger MCP Tools", () => {
  let toolManager: ToolManager;

  beforeAll(() => {
    toolManager = new ToolManager();
    const config = createConfigWithPort(3000, {
      credentialPath: process.env.GOOGLE_CLIENT_SECRET_PATH,
      blogId: process.env.BLOG_ID || undefined,
    });
    toolManager.registerBloggerTools(config);
  });

  afterEach(() => {
    // 테스트 후 토큰 정리
    TokenManager.clearTokens();
  });

  it("blog-post: 인증 토큰이 없으면 에러를 반환해야 한다", async () => {
    TokenManager.clearTokens();
    const result = await toolManager.callTool("blog-post", {
      blogId: "dummy-blog-id",
      title: "테스트 포스트",
      content: "테스트 내용",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("인증 토큰이 없습니다");
  });

  it("blog-batch-post: 인증 토큰이 없으면 에러를 반환해야 한다", async () => {
    TokenManager.clearTokens();
    const result = await toolManager.callTool("blog-batch-post", {
      blogId: "dummy-blog-id",
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
