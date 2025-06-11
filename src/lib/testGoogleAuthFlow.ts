import { runGoogleAuthFlow } from "./googleAuthFlow";
import { TokenManager } from "./tokenManager";
import GoogleAuth from "./googleAuth";
import BloggerService from "../services/bloggerService";
import { createConfigWithPort } from "../config.js";

async function testAuthAndApi() {
  // 테스트용 포트(3000)로 config 생성
  const config = createConfigWithPort(3000, {
    credentialPath: process.env.GOOGLE_CLIENT_SECRET_PATH,
    blogId: process.env.BLOG_ID || undefined,
  });
  let tokens = TokenManager.loadTokens();
  let needAuth = false;

  if (!tokens || !tokens.access_token) {
    console.log(
      "토큰 파일이 없거나 액세스 토큰이 없습니다. 인증이 필요합니다."
    );
    needAuth = true;
  } else {
    // 토큰이 있으면 API 호출 테스트
    try {
      const googleAuth = new GoogleAuth(config);
      googleAuth.setCredentials(tokens);
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
      await runGoogleAuthFlow(config);
      console.log("✅ 인증 플로우가 정상적으로 완료되었습니다.");
      // 인증 후 API 재시도
      tokens = TokenManager.loadTokens();
      const googleAuth = new GoogleAuth(config);
      googleAuth.setCredentials(tokens!);
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
