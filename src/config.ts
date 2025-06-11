import fs from "fs";
import path from "path";
import { Config, GoogleCredentials } from "./types/bloggerTypes.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param port 서버 포트
 * @param options.credentialPath credentials 파일 경로 (우선순위 1)
 * @param options.credentials credentials 객체 (우선순위 2)
 * @param options.blogId 블로그 ID (우선순위 1)
 */
function createConfigWithPort(
  port: number,
  options?: {
    credentialPath?: string;
    credentials?: GoogleCredentials;
    blogId?: string | null;
  }
): Config {
  let credentials: GoogleCredentials;
  if (options?.credentials) {
    credentials = options.credentials;
  } else {
    const credentialPath =
      options?.credentialPath || process.env.GOOGLE_CLIENT_SECRET_PATH;
    if (!credentialPath) {
      throw new Error(
        "GOOGLE_CLIENT_SECRET_PATH 환경변수가 설정되지 않았습니다."
      );
    }
    credentials = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  }
  return {
    google: {
      clientId: credentials.web.client_id,
      clientSecret: credentials.web.client_secret,
      scopes: ["https://www.googleapis.com/auth/blogger"],
      redirectUri:
        process.env.REDIRECT_URI ||
        `http://localhost:${port}/auth/google/callback`,
    },
    server: {
      sessionSecret:
        process.env.SESSION_SECRET || "your-session-secret-change-this",
      port,
    },
    blog: {
      id: options?.blogId || process.env.BLOG_ID || null,
    },
  };
}

// 기본 설정 (환경변수 포트 또는 3000)
const defaultPort = parseInt(process.env.PORT || "3000", 10);
const config: Config = createConfigWithPort(defaultPort);

export { createConfigWithPort };
