import { runGoogleAuthFlow } from "../src/lib/googleAuthFlow";
import { TokenManager } from "../src/lib/tokenManager";
import GoogleAuth from "../src/lib/googleAuth.js";
import BloggerService from "../src/services/bloggerService";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

async function testAuthAndApi() {
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

  let tokens = await TokenManager.loadTokens();
  let needAuth = false;

  if (!tokens || !tokens.access_token) {
    console.log(
      "토큰 파일이 없거나 액세스 토큰이 없습니다. 인증이 필요합니다."
    );
    needAuth = true;
  } else {
    // 토큰이 있으면 API 호출 테스트
    try {
      const bloggerService = new BloggerService(googleAuth.getAuthClient());
      const blogs = await bloggerService.getBlogsList();
      console.log("✅ API 호출 성공! 블로그 목록:", blogs);
      return;
    } catch (err: any) {
      if (err.code === 401 || err.code === 403) {
        console.log("토큰이 있지만 권한 없음(401/403). 인증이 필요합니다.");
        needAuth = true;
      } else {
        console.error("API 호출 중 알 수 없는 오류:", err);
        return;
      }
    }
  }

  if (needAuth) {
    try {
      await runGoogleAuthFlow(googleAuth);
      console.log("✅ 인증 플로우가 정상적으로 완료되었습니다.");
      // 인증 후 API 재시도
      tokens = await TokenManager.loadTokens();
      const bloggerService = new BloggerService(googleAuth.getAuthClient());
      const blogs = await bloggerService.getBlogsList();
      console.log("✅ 인증 후 API 호출 성공! 블로그 목록:", blogs);
    } catch (err) {
      console.error("❌ 인증 플로우 실패:", err);
    }
  }
}

// 실행
(async () => {
  await testAuthAndApi();
  process.exit(0); // 인증 및 테스트가 끝나면 프로세스 종료
})();
