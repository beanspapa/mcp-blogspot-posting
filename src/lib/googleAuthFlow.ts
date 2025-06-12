import http from "http";
import open from "open"; // npm install open 필요
import GoogleAuth from "./googleAuth.js";
import { TokenManager } from "./tokenManager.js";
import { Config } from "../types/bloggerTypes.js";

/**
 * Google OAuth 인증 플로우를 실행한다.
 * - 임의 포트로 로컬 웹서버를 띄우고,
 * - 인증 URL을 브라우저로 오픈,
 * - 콜백에서 토큰을 발급/저장,
 * - 인증 완료 메시지를 브라우저에 표시한다.
 * @param config Config 객체 (필수)
 */
export async function runGoogleAuthFlow(googleAuth: GoogleAuth): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url && req.url.startsWith("/auth/google/callback")) {
        const urlObj = new URL(
          req.url,
          `http://localhost:${(server.address() as any).port}`
        );
        const code = urlObj.searchParams.get("code");
        if (code) {
          try {
            // 콜백에서 받은 포트와 동일한 redirectUri로 GoogleAuth 인스턴스의 redirectUri를 동적으로 세팅
            const redirectUri = `http://localhost:${(server.address() as any).port}/auth/google/callback`;
            googleAuth.redirectUri = redirectUri;
            googleAuth.oauth2Client.redirectUri = redirectUri;
            const tokens = await googleAuth.getTokenFromCode(code);
            TokenManager.saveTokens(tokens);
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(
              "<h2>인증이 완료되었습니다.<br>브라우저를 닫으셔도 됩니다.</h2>"
            );
            server.close();
            resolve();
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h2>인증 실패. 다시 시도해 주세요.</h2>");
            server.close();
            reject(err);
          }
        }
      }
    });

    server.listen(0, () => {
      const port = (server.address() as any).port;
      // 콜백 경로를 /auth/google/callback 으로 고정
      const redirectUri = `http://localhost:${port}/auth/google/callback`;
      // GoogleAuth 인스턴스에 redirectUri를 직접 전달
      googleAuth.redirectUri = redirectUri;
      googleAuth.oauth2Client.redirectUri = redirectUri;
      const authUrl = googleAuth.generateAuthUrl();
      open(authUrl); // 브라우저 자동 오픈
      console.log(`브라우저에서 인증을 진행하세요: ${authUrl}`);
    });
  });
}
