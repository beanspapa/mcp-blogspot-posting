import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

async function main() {
  // 1. 클라이언트 생성
  const client = new Client({
    name: "boilerplate-test-client",
    version: "1.0.0",
  });

  // 2. Stdio 전송 계층 생성 및 연결
  const transport = new StdioClientTransport({
    command: "npm",
    args: ["run", "dev"],
  });
  await client.connect(transport);
  console.log("✅ Connected to MCP server");

  // 3. 서버 정보 조회
  console.log("\n===== Server Info =====");
  const serverInfo = await client.request(
    { method: "server/info" },
    z.object({
      name: z.string(),
      version: z.string(),
      capabilities: z.any(),
      state: z.any(),
      metrics: z.any(),
    })
  );
  console.log(`Name: ${serverInfo.name}`);
  console.log(`Version: ${serverInfo.version}`);
  console.log("=======================");

  try {
    while (true) {
      const command = await rl.question(
        "\nEnter command (list-tools, call-tool, list-resources, read-resource, list-prompts, get-prompt, exit): "
      );

      switch (command) {
        case "list-tools":
          await testListTools(client);
          break;
        case "call-tool":
          await testCallTool(client);
          break;
        case "list-resources":
          await testListResources(client);
          break;
        case "read-resource":
          await testReadResource(client);
          break;
        case "list-prompts":
          await testListPrompts(client);
          break;
        case "get-prompt":
          await testGetPrompt(client);
          break;
        case "exit":
          console.log("Exiting...");
          return;
        default:
          console.log("Unknown command");
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await client.close();
    rl.close();
    console.log("🔌 Disconnected from server.");
  }
}

async function testListTools(client: Client) {
  console.log("\n--- Testing listTools ---");
  const result = await client.request(
    { method: "tools/list" },
    z.object({
      tools: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          inputSchema: z.any(),
        })
      ),
    })
  );
  console.log("Response:", result);
}

async function testCallTool(client: Client) {
  console.log("\n--- Testing callTool ---");
  const toolName = await rl.question("Enter tool name: ");
  const argsStr = await rl.question("Enter arguments (JSON format): ");
  try {
    const args = JSON.parse(argsStr);
    const result = await client.request(
      {
        method: "tools/call",
        params: { name: toolName, arguments: args },
      },
      z.object({
        content: z.array(
          z.object({
            type: z.string(),
            text: z.string(),
          })
        ),
      })
    );
    console.log("Response:", result);
  } catch (error) {
    console.error("Error calling tool:", error);
  }
}

async function testListResources(client: Client) {
  console.log("\n--- Testing listResources ---");
  const result = await client.request(
    { method: "resources/list" },
    z.object({
      resources: z.array(
        z.object({
          uri: z.string(),
          name: z.string(),
          description: z.string().optional(),
          mimeType: z.string().optional(),
        })
      ),
    })
  );
  console.log("Response:", result);
}

async function testReadResource(client: Client) {
  console.log("\n--- Testing readResource ---");
  const uri = await rl.question("Enter resource URI: ");
  try {
    const result = await client.request(
      { method: "resources/read", params: { uri } },
      z.object({
        contents: z.array(
          z.object({
            uri: z.string(),
            mimeType: z.string(),
            text: z.string(),
          })
        ),
      })
    );
    console.log("Response:", result);
  } catch (error) {
    console.error("Error reading resource:", error);
  }
}

async function testListPrompts(client: Client) {
  console.log("\n--- Testing listPrompts ---");
  const result = await client.request(
    { method: "prompts/list" },
    z.object({
      prompts: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          arguments: z.any().optional(),
        })
      ),
    })
  );
  console.log("Response:", result);
}

async function testGetPrompt(client: Client) {
  console.log("\n--- Testing getPrompt ---");
  const promptName = await rl.question("Enter prompt name: ");
  const argsStr = await rl.question("Enter arguments (JSON format): ");
  try {
    const args = JSON.parse(argsStr);
    const result = await client.request(
      {
        method: "prompts/get",
        params: { name: promptName, arguments: args },
      },
      z.object({
        description: z.string().optional(),
        messages: z.array(
          z.object({
            role: z.string(),
            content: z.any(),
          })
        ),
      })
    );
    console.log("Response:", result);
  } catch (error) {
    console.error("Error getting prompt:", error);
  }
}

main()
  .then(() => {
    console.log("\nTest client finished.");
  })
  .catch((error) => {
    console.error("CLI Test failed:", error);
    process.exit(1);
  });
