import { google } from "googleapis";
import { TokenSet } from "../types/bloggerTypes.js";
import { logInfo, logError } from "../utils/logger.js";

class GoogleAuth {
  public oauth2Client: any;
  private clientId: string;
  private clientSecret: string;
  private scopes: string[];
  public redirectUri?: string;

  constructor({
    clientId,
    clientSecret,
    scopes,
    redirectUri,
  }: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri?: string;
  }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scopes = scopes;
    this.redirectUri = redirectUri;
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri ?? ""
    );

    // 토큰 자동 갱신 설정
    this.oauth2Client.on("tokens", (tokens: any) => {
      if (tokens.refresh_token) {
        // 리프레시 토큰 저장 (실제 프로덕션에서는 데이터베이스에 저장)
        logInfo("리프레시 토큰 업데이트됨");
      }
      // 액세스 토큰 저장
      logInfo("액세스 토큰 업데이트됨");
    });
  }

  // 인증 URL 생성
  generateAuthUrl(): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      include_granted_scopes: true,
      prompt: "consent", // 항상 리프레시 토큰을 받기 위해
    });
    return authUrl;
  }

  // 인증 코드로 토큰 교환
  async getTokenFromCode(code: string): Promise<TokenSet> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      logError("토큰 교환 오류: " + error);
      throw error;
    }
  }

  // 토큰 설정
  setCredentials(tokens: TokenSet): void {
    this.oauth2Client.setCredentials(tokens);
  }

  // 토큰 갱신
  async refreshAccessToken(): Promise<TokenSet> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      const newTokens: TokenSet = {
        access_token: credentials.access_token || "",
        refresh_token:
          credentials.refresh_token ||
          this.oauth2Client.credentials.refresh_token ||
          "",
        expiry_date: credentials.expiry_date || 0,
        scope: credentials.scope,
        token_type: credentials.token_type,
      };

      // 새로운 토큰으로 OAuth 클라이언트 업데이트
      this.oauth2Client.setCredentials(credentials);

      logInfo("✅ 토큰이 성공적으로 갱신되었습니다.");
      return newTokens;
    } catch (error) {
      logError("❌ 토큰 갱신 실패: " + error);
      throw new Error("토큰 갱신에 실패했습니다. 다시 인증이 필요합니다.");
    }
  }

  // 유효한 토큰 확인 및 갱신
  async ensureValidToken(): Promise<TokenSet | null> {
    try {
      await this.oauth2Client.getAccessToken();
      return null; // 기존 토큰이 유효
    } catch (error: any) {
      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired")
      ) {
        // 리프레시 토큰으로 새 액세스 토큰 요청
        try {
          return await this.refreshAccessToken();
        } catch (refreshError) {
          throw new Error("토큰 갱신 실패. 재인증이 필요합니다.");
        }
      } else {
        throw error;
      }
    }
  }

  // 인증된 클라이언트 반환
  getAuthClient(): any {
    return this.oauth2Client;
  }
}

export default GoogleAuth;
