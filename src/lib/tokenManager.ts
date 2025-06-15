import fs from "fs";
import path from "path";
import { TokenSet } from "../types/bloggerTypes.js";
import { logInfo, logError } from "../utils/logger.js";

const TOKENS_FILE = path.join(process.cwd(), ".blogger-tokens.json");

export class TokenManager {
  // 토큰 저장
  static async saveTokens(tokens: TokenSet): Promise<void> {
    try {
      await fs.promises.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
      logInfo("✅ 토큰이 저장되었습니다.");
    } catch (error) {
      logError("❌ 토큰 저장 실패: " + error);
    }
  }

  // 토큰 로드
  static async loadTokens(): Promise<TokenSet | null> {
    try {
      await fs.promises.access(TOKENS_FILE);
      const tokenData = await fs.promises.readFile(TOKENS_FILE, "utf8");
      return JSON.parse(tokenData);
    } catch (error) {
      logError("❌ 토큰 로드 실패: " + error);
      return null;
    }
  }

  // 토큰 삭제
  static async clearTokens(): Promise<void> {
    try {
      await fs.promises.access(TOKENS_FILE);
      await fs.promises.unlink(TOKENS_FILE);
      logInfo("✅ 토큰이 삭제되었습니다.");
    } catch (error) {
      logError("❌ 토큰 삭제 실패: " + error);
    }
  }

  // 토큰 유효성 확인
  static async hasValidTokens(): Promise<boolean> {
    const tokens = await this.loadTokens();
    return tokens !== null && !!tokens.access_token;
  }

  // 토큰 만료 확인
  static isTokenExpired(tokens: TokenSet): boolean {
    if (!tokens.expiry_date) return false;
    return Date.now() >= tokens.expiry_date;
  }

  // 토큰 갱신 필요 여부 확인
  static needsRefresh(tokens: TokenSet): boolean {
    if (!tokens.expiry_date) return false;
    // 만료 5분 전에 갱신
    return Date.now() >= tokens.expiry_date - 5 * 60 * 1000;
  }

  // 토큰 상태 확인 및 분류
  static async getTokenStatus(
    tokens: TokenSet | null
  ): Promise<"valid" | "needs_refresh" | "expired" | "missing"> {
    if (!tokens) return "missing";
    if (!tokens.access_token) return "missing";

    if (this.isTokenExpired(tokens)) {
      return tokens.refresh_token ? "expired" : "missing";
    }

    if (this.needsRefresh(tokens)) return "needs_refresh";
    return "valid";
  }

  // 리프레시 토큰 유효성 확인
  static hasValidRefreshToken(tokens: TokenSet): boolean {
    return !!(tokens && tokens.refresh_token);
  }
}
