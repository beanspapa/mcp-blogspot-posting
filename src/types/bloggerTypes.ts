export interface BlogPost {
  title: string;
  content: string;
  labels?: string[];
  isDraft?: boolean;
  published?: string;
  additionalFields?: {
    [key: string]: any;
  };
}

export interface BlogInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  posts?: {
    totalItems: number;
    selfLink: string;
  };
  pages?: {
    totalItems: number;
    selfLink: string;
  };
  locale?: {
    language: string;
    country: string;
    variant: string;
  };
}

export interface PostResponse {
  kind: string;
  id: string;
  blog: {
    id: string;
  };
  published: string;
  updated: string;
  url: string;
  selfLink: string;
  title: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    url: string;
    image: {
      url: string;
    };
  };
  replies?: {
    totalItems: string;
    selfLink: string;
  };
  labels?: string[];
  customMetaData?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
    span: string;
  };
}

export interface BatchPostResult {
  success: boolean;
  postId?: string;
  url?: string;
  title: string;
  error?: string;
}

export interface PostListOptions {
  view?: 'ADMIN' | 'AUTHOR' | 'READER';
  startDate?: string;
  endDate?: string;
  labels?: string;
  maxResults?: number;
  pageToken?: string;
  status?: 'draft' | 'live' | 'scheduled';
  fetchBodies?: boolean;
  fetchImages?: boolean;
}

export interface TokenSet {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export interface GoogleCredentials {
  web: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
    javascript_origins: string[];
  };
}

export interface Config {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  server: {
    port: number;
    sessionSecret: string;
  };
  blog: {
    id: string | null;
  };
} 