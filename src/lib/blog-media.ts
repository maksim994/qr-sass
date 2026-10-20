import { getBlogMediaObject } from "@/lib/s3";
import { createBlogMediaHandler } from "@/lib/blog-media-http";

export const blogMedia = createBlogMediaHandler(getBlogMediaObject);
