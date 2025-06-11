import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

async function testBlogspotMCPServer() {
  const client = new Client({
    name: "blogspot-test-client",
    version: "1.0.0",
  });

  // .env에서 환경변수 로드
  const env = {
    ...process.env,
    GOOGLE_CLIENT_SECRET_PATH: process.env.GOOGLE_CLIENT_SECRET_PATH || "",
    BLOG_URL: process.env.BLOG_URL || "",
  };
  if (!env.GOOGLE_CLIENT_SECRET_PATH) {
    throw new Error(
      "테스트 실행 전 .env에 GOOGLE_CLIENT_SECRET_PATH를 반드시 지정하세요."
    );
  }

  // MCP 서버 실행 및 연결
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/src/server.js"],
    env,
  });
  await client.connect(transport);
  console.log("Connected to MCP blogspot server");

  // blog-post Tool 호출 예시
  const result = await client.request(
    {
      method: "tools/call",
      params: {
        name: "blog-post",
        arguments: {
          blogId: "여기에_블로그_ID", // 실제 블로그 ID로 교체
          title: "테스트 포스트 (통합 테스트)",
          content: "이것은 MCP 클라이언트 통합 테스트용 포스트입니다.",
        },
      },
    },
    z.object({
      content: z.array(z.object({ type: z.string(), text: z.string() })),
      isError: z.boolean(),
    })
  );
  console.log("blog-post Tool 결과:", result);

  await client.close();
  console.log("MCP client disconnected");
}

(async () => {
  await testBlogspotMCPServer();
  process.exit(0);
})().catch((error) => {
  console.error("Test failed:", error);
  if (error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
