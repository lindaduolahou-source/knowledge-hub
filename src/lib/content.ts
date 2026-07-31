import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Locale } from "@/i18n/config";

const contentRoot = path.join(process.cwd(), "content");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  locale: Locale;
}

export interface Post extends PostMeta {
  content: string;
}

export interface Project {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  github?: string;
  demo?: string;
  featured?: boolean;
  locale: Locale;
}

export interface Thought extends PostMeta {}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "completed" | "inProgress" | "planned";
  topics: string[];
  /** Extra user-defined fields within the stage. */
  fields?: { id: string; label: string; value: string }[];
  /** Built-in status/title/description/topics slots still shown. */
  coreSlots?: ("status" | "title" | "description" | "topics")[];
}

function readMarkdownDir(
  type: "blog" | "thoughts",
  locale: Locale,
): PostMeta[] {
  const dir = path.join(contentRoot, type, locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const { data } = matter(raw);
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        excerpt: data.excerpt as string,
        tags: (data.tags as string[]) ?? [],
        locale,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function readMarkdownFile(
  type: "blog" | "thoughts",
  locale: Locale,
  slug: string,
): Post | null {
  const filePath = path.join(contentRoot, type, locale, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    excerpt: data.excerpt as string,
    tags: (data.tags as string[]) ?? [],
    locale,
    content,
  };
}

export function getPosts(locale: Locale): PostMeta[] {
  return readMarkdownDir("blog", locale);
}

export function getPost(locale: Locale, slug: string): Post | null {
  return readMarkdownFile("blog", locale, slug);
}

export function getThoughts(locale: Locale): PostMeta[] {
  return readMarkdownDir("thoughts", locale);
}

export function getThought(locale: Locale, slug: string): Post | null {
  return readMarkdownFile("thoughts", locale, slug);
}

export function getProjects(locale: Locale): Project[] {
  const dir = path.join(contentRoot, "projects", locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((filename) => {
      const slug = filename.replace(/\.json$/, "");
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, filename), "utf-8"),
      );
      return { slug, locale, ...raw } as Project;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getProject(locale: Locale, slug: string): Project | null {
  const filePath = path.join(contentRoot, "projects", locale, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return { slug, locale, ...raw } as Project;
}

export function getRoadmap(locale: Locale): RoadmapItem[] {
  const filePath = path.join(contentRoot, "roadmap", `${locale}.json`);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as RoadmapItem[];
}

export function getAllTags(locale: Locale): string[] {
  const posts = getPosts(locale);
  const tags = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags);
}
