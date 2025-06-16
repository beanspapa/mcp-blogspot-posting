import { z } from "zod";

export const blogPostInputSchema = z.object({
  title: z.string().describe("포스트 제목"),
  content: z.string().describe("포스트 내용(HTML)"),
  labels: z.array(z.string()).optional().describe("라벨 목록"),
  isDraft: z.boolean().optional().describe("초안 여부"),
});

export const blogBatchPostInputSchema = z.object({
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      labels: z.array(z.string()).optional(),
      isDraft: z.boolean().optional(),
    })
  ).describe("포스트 배열"),
}); 