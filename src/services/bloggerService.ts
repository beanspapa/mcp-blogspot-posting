import { google } from "googleapis";
import {
  BlogPost,
  BlogInfo,
  PostResponse,
  BatchPostResult,
  PostListOptions,
} from "../types/bloggerTypes";
import { logInfo, logError } from "../utils/logger.js";

class BloggerService {
  private authClient: any;
  private blogger: any;

  constructor(authClient: any) {
    this.authClient = authClient;
    this.blogger = google.blogger({
      version: "v3",
      auth: authClient,
    });
  }

  // 사용자가 접근 가능한 블로그 목록 조회
  async getBlogsList(): Promise<BlogInfo[]> {
    try {
      const response = await this.blogger.blogs.listByUser({
        userId: "self",
      });
      return response.data.items || [];
    } catch (error) {
      logError("블로그 목록 조회 오류: " + error);
      throw error;
    }
  }

  // 특정 블로그 정보 조회
  async getBlogInfo(blogId: string): Promise<BlogInfo> {
    try {
      const response = await this.blogger.blogs.get({
        blogId: blogId,
      });
      return response.data;
    } catch (error) {
      logError("블로그 정보 조회 오류: " + error);
      throw error;
    }
  }

  // URL로 블로그 정보 조회
  async getBlogByUrl(blogUrl: string): Promise<BlogInfo> {
    try {
      const response = await this.blogger.blogs.getByUrl({
        url: blogUrl,
      });
      return response.data;
    } catch (error) {
      logError("URL로 블로그 조회 오류: " + error);
      throw error;
    }
  }

  // 블로그 주소로 블로그 ID 조회
  async getBlogIdByUrl(blogUrl: string): Promise<string> {
    const info = await this.getBlogByUrl(blogUrl);
    if (!info || !info.id) {
      throw new Error("블로그 주소에서 블로그 ID를 찾을 수 없습니다.");
    }
    return info.id;
  }

  // 블로그 포스트 목록 조회
  async getPosts(blogId: string, options: PostListOptions = {}): Promise<any> {
    try {
      const params = {
        blogId: blogId,
        ...options,
      };

      const response = await this.blogger.posts.list(params);
      return response.data;
    } catch (error) {
      logError("포스트 목록 조회 오류: " + error);
      throw error;
    }
  }

  // 새 포스트 작성
  async createPost(blogId: string, postData: BlogPost): Promise<PostResponse> {
    try {
      const post = {
        title: postData.title,
        content: postData.content,
        labels: postData.labels || [],
      };

      const insertParams: any = {
        blogId: blogId,
        resource: post,
        fetchBody: true,
        fetchImages: true,
      };

      // isDraft는 별도 파라미터로 전달
      if (postData.isDraft) {
        insertParams.isDraft = true;
      }

      const response = await this.blogger.posts.insert(insertParams);

      logInfo("포스트 작성 성공: " + response.data.url);
      return response.data;
    } catch (error) {
      logError("포스트 작성 오류: " + error);
      throw error;
    }
  }

  // 포스트 수정
  async updatePost(
    blogId: string,
    postId: string,
    postData: BlogPost
  ): Promise<PostResponse> {
    try {
      const post = {
        id: postId,
        title: postData.title,
        content: postData.content,
        labels: postData.labels || [],
        ...postData.additionalFields,
      };

      const response = await this.blogger.posts.update({
        blogId: blogId,
        postId: postId,
        resource: post,
      });

      logInfo("포스트 수정 성공: " + response.data.url);
      return response.data;
    } catch (error) {
      logError("포스트 수정 오류: " + error);
      throw error;
    }
  }

  // 포스트 삭제
  async deletePost(blogId: string, postId: string): Promise<boolean> {
    try {
      await this.blogger.posts.delete({
        blogId: blogId,
        postId: postId,
      });
      logInfo("포스트 삭제 성공");
      return true;
    } catch (error) {
      logError("포스트 삭제 오류: " + error);
      throw error;
    }
  }

  // 초안으로 저장
  async saveDraft(blogId: string, postData: BlogPost): Promise<PostResponse> {
    const draftData = {
      ...postData,
      isDraft: true,
    };
    return await this.createPost(blogId, draftData);
  }

  // 예약 발행 (미래 날짜로 발행)
  async schedulePost(
    blogId: string,
    postData: BlogPost,
    publishDate: Date
  ): Promise<PostResponse> {
    const scheduledData = {
      ...postData,
      published: publishDate.toISOString(),
    };
    return await this.createPost(blogId, scheduledData);
  }

  // 배치 포스트 작성 (여러 포스트 한 번에)
  async batchCreatePosts(
    blogId: string,
    postsArray: BlogPost[]
  ): Promise<BatchPostResult[]> {
    const results = [];

    for (const postData of postsArray) {
      try {
        const result = await this.createPost(blogId, postData);
        results.push({
          success: true,
          postId: result.id,
          url: result.url,
          title: postData.title,
        });

        // API 제한을 위한 딜레이 (1초)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          title: postData.title,
        });
      }
    }

    return results;
  }

  // API 재시도 로직이 포함된 요청
  async retryApiCall(
    apiCall: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = Math.pow(2, i) * 1000; // 지수 백오프
        logInfo(`API 호출 실패, ${delay}ms 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

export default BloggerService;
