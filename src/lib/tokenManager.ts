import fs from 'fs';
import path from 'path';
import { TokenSet } from '../types/bloggerTypes';

const TOKENS_FILE = path.join(process.cwd(), '.blogger-tokens.json');

export class TokenManager {
  // 토큰 저장
  static saveTokens(tokens: TokenSet): void {
    try {
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
      console.log('✅ 토큰이 저장되었습니다.');
    } catch (error) {
      console.error('❌ 토큰 저장 실패:', error);
    }
  }

  // 토큰 로드
  static loadTokens(): TokenSet | null {
    try {
      if (fs.existsSync(TOKENS_FILE)) {
        const tokenData = fs.readFileSync(TOKENS_FILE, 'utf8');
        return JSON.parse(tokenData);
      }
      return null;
    } catch (error) {
      console.error('❌ 토큰 로드 실패:', error);
      return null;
    }
  }

  // 토큰 삭제
  static clearTokens(): void {
    try {
      if (fs.existsSync(TOKENS_FILE)) {
        fs.unlinkSync(TOKENS_FILE);
        console.log('✅ 토큰이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('❌ 토큰 삭제 실패:', error);
    }
  }

  // 토큰 유효성 확인
  static hasValidTokens(): boolean {
    const tokens = this.loadTokens();
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
    return Date.now() >= (tokens.expiry_date - 5 * 60 * 1000);
  }

  // 토큰 상태 확인 및 분류
  static getTokenStatus(tokens: TokenSet | null): 'valid' | 'needs_refresh' | 'expired' | 'missing' {
    if (!tokens) return 'missing';
    if (!tokens.access_token) return 'missing';
    
    if (this.isTokenExpired(tokens)) {
      return tokens.refresh_token ? 'expired' : 'missing';
    }
    
    if (this.needsRefresh(tokens)) return 'needs_refresh';
    return 'valid';
  }

  // 리프레시 토큰 유효성 확인
  static hasValidRefreshToken(tokens: TokenSet): boolean {
    return !!(tokens && tokens.refresh_token);
  }
} 