import { z } from "zod";

const SAFE_URL = z.string().refine(
  (v) => v.startsWith("https://") || v.startsWith("/") || v.startsWith("./"),
  { message: "URL must be https or a relative path" },
);

export const ImageConfig = z.object({
  url: SAFE_URL,
  alt: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
});
export type ImageConfig = z.infer<typeof ImageConfig>;
