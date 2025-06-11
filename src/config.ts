import fs from 'fs';
import path from 'path';
import { Config, GoogleCredentials } from './types/bloggerTypes';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수로 client_secret 경로 지정 가능
const credentialsPath =
  process.env.GOOGLE_CLIENT_SECRET_PATH ||
  path.join(__dirname, '../client_secret_1084566906373-hh8nsqv523g4b5l0p1l8c94vut1a79gj.apps.googleusercontent.com.json');
const credentials: GoogleCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// 기본 설정 (포트는 나중에 동적으로 설정)
const baseConfig = {
  google: {
    clientId: credentials.web.client_id,
    clientSecret: credentials.web.client_secret,
    scopes: ['https://www.googleapis.com/auth/blogger']
  },
  server: {
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-this'
  },
  blog: {
    id: process.env.BLOG_ID || null
  }
};

// 동적 포트 설정을 위한 함수
function createConfigWithPort(port: number): Config {
  return {
    ...baseConfig,
    google: {
      ...baseConfig.google,
      // OAuth 2.0 표준(RFC 8252)에 따라 http://localhost는 임의의 포트 허용
      redirectUri: process.env.REDIRECT_URI || `http://localhost:${port}/auth/google/callback`
    },
    server: {
      ...baseConfig.server,
      port
    }
  };
}

// 기본 설정 (환경변수 포트 또는 3000)
const defaultPort = parseInt(process.env.PORT || '3000', 10);
const config: Config = createConfigWithPort(defaultPort);

export { createConfigWithPort };
export default config; 