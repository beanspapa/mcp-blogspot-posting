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

  console.log("[테스트 시작] MCP Blogspot 클라이언트 통합 테스트");

  // .env에서 환경변수 로드
  const env = {
    GOOGLE_CLIENT_SECRET_PATH: process.env.GOOGLE_CLIENT_SECRET_PATH || "",
    BLOG_URL: process.env.BLOG_URL || "",
  };
  if (!env.GOOGLE_CLIENT_SECRET_PATH) {
    throw new Error(
      "테스트 실행 전 .env에 GOOGLE_CLIENT_SECRET_PATH를 반드시 지정하세요."
    );
  }
  if (!env.BLOG_URL) {
    throw new Error(
      "테스트 실행 전 .env에 BLOG_URL을 반드시 지정하세요."
    );
  }

  // MCP 서버 실행 및 연결
  console.log("[서버 연결 시도] node dist/src/server.js");
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/src/server.js"],
    env: { ...process.env, ...env },
  });
  await client.connect(transport);
  console.log("[서버 연결 성공] MCP blogspot server");

  // blog-post Tool 호출 예시 (blogId 입력 제거)
  console.log("[blog-post Tool 호출]");
  const postResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "blog-post",
        arguments: {
          title: "테스트 포스트 (통합 테스트)",
          content: "이것은 MCP 클라이언트 통합 테스트용 포스트입니다.",
          labels: ["통합", "테스트"],
          isDraft: true,
        },
      },
    },
    z.object({
      content: z.array(z.object({ type: z.string(), text: z.string() })),
      isError: z.boolean(),
    })
  );
  console.log("[blog-post Tool 결과]", postResult);

  // blog-batch-post Tool 호출 예시
  console.log("[blog-batch-post Tool 호출]");
  const batchResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "blog-batch-post",
        arguments: {
          posts: [
            {
              title: "배치 포스트1",
              content: "<h1>배치1</h1>",
              labels: ["batch", "test"],
              isDraft: true,
            },
            {
              title: "배치 포스트2",
              content: "<h1>배치2</h1>",
            },
          ],
        },
      },
    },
    z.object({
      content: z.array(z.object({ type: z.string(), text: z.string() })),
      isError: z.boolean(),
    })
  );
  console.log("[blog-batch-post Tool 결과]", batchResult);

  // (선택) 실패 케이스: 인증 토큰 없음 등은 별도 환경에서 테스트 권장

  await client.close();
  console.log("[테스트 종료] MCP client disconnected");
}

(async () => {
  await testBlogspotMCPServer();
  process.exit(0);
})().catch((error) => {
  console.error("[테스트 실패]", error);
  if (error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
