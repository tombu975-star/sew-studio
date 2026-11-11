"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Heart,
  Pin,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Image as ImageIcon,
  Megaphone,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { EmptyState, SkeletonCard } from "@/components/atelier/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import type { CommunityPost, CommunityPostType } from "@/lib/types";

// ───────────────────────────── helpers ─────────────────────────────

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const initialOf = (name?: string | null) =>
  (name?.trim()?.charAt(0) || "?").toUpperCase();

const TYPE_META: Record<
  CommunityPostType,
  {
    label: string;
    chip: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  update: {
    label: "Update",
    chip: "bg-stone-100 text-stone-600 border-stone-200",
    icon: Sparkles,
  },
  question: {
    label: "Question",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
    icon: HelpCircle,
  },
  inspiration: {
    label: "Inspiration",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Lightbulb,
  },
  showcase: {
    label: "Showcase",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: ImageIcon,
  },
  announcement: {
    label: "Announcement",
    chip: "bg-[#832138]/10 text-[#832138] border-[#832138]/20",
    icon: Megaphone,
  },
};

function roleChip(role?: string | null): {
  label: string;
  className: string;
} {
  switch (role) {
    case "madam":
      return {
        label: "Owner",
        className: "bg-[#832138]/10 text-[#832138] border-[#832138]/20",
      };
    case "staff":
      return {
        label: "Staff",
        className: "bg-stone-100 text-stone-600 border-stone-200",
      };
    case "trainer":
      return {
        label: "Trainer",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    case "trainee":
      return {
        label: "Trainee",
        className: "bg-sky-100 text-sky-800 border-sky-200",
      };
    default:
      return {
        label: "Member",
        className: "bg-stone-100 text-stone-600 border-stone-200",
      };
  }
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "update", label: "Updates" },
  { key: "question", label: "Questions" },
  { key: "inspiration", label: "Inspiration" },
  { key: "showcase", label: "Showcases" },
  { key: "announcement", label: "Announcements" },
];

const MAX_BODY = 500;

// ───────────────────────────── main view ─────────────────────────────

export default function Community() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isOwner = user?.role === "madam";

  // Composer state
  const [type, setType] = useState<CommunityPostType>("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Filter
  const [filter, setFilter] = useState<string>("all");

  // Liked post ids — persisted per user in localStorage so the heart stays
  // filled across sessions even though the API doesn't expose `likedByMe`.
  const storageKey = user ? `ms_community_liked_${user.id}` : null;
  const [likedSet, setLikedSet] = useState<Set<string>>(() => {
    if (!storageKey || typeof window === "undefined") return new Set();
    try {
      const stored = window.localStorage.getItem(storageKey);
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(likedSet))
      );
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [likedSet, storageKey]);

  // Fetch posts
  const {
    data: posts,
    isLoading,
    isError,
  } = useQuery<CommunityPost[]>({
    queryKey: ["community"],
    queryFn: () => apiGet<CommunityPost[]>("/api/community"),
  });

  // Create post
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in.");
      return apiPost<CommunityPost>("/api/community", {
        authorId: user.id,
        authorName: user.fullName,
        authorRole: user.role,
        type,
        title: title.trim() || undefined,
        body: body.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Posted to the wall.");
      setBody("");
      setTitle("");
      setType("update");
    },
    onError: (e) => {
      toast.error("Couldn't post — please try again.", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });

  // Like toggle — optimistic cache mutation + local-set sync.
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not signed in.");
      return apiPost<{ liked: boolean }>(`/api/community/${postId}/like`, {
        authorId: user.id,
      });
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["community"] });
      const prev = queryClient.getQueryData<CommunityPost[]>(["community"]);
      const wasLiked = likedSet.has(postId);
      queryClient.setQueryData<CommunityPost[]>(["community"], (old) =>
        (old ?? []).map((p) =>
          p.id === postId
            ? {
                ...p,
                _count: {
                  likes: Math.max(
                    0,
                    (p._count?.likes ?? 0) + (wasLiked ? -1 : 1)
                  ),
                },
              }
            : p
        )
      );
      setLikedSet((s) => {
        const next = new Set(s);
        if (wasLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });
      return { prev };
    },
    onError: (_e, _postId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["community"], ctx.prev);
      toast.error("Couldn't update like — please try again.");
    },
    onSuccess: (data, postId) => {
      setLikedSet((s) => {
        const next = new Set(s);
        if (data.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      if (data.liked) toast.success("Liked.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  // Visible posts: pinned always surface first, then the active filter.
  const visiblePosts = useMemo(() => {
    if (!posts) return [];
    if (filter === "all") return posts;
    const pinned = posts.filter((p) => p.pinned);
    const filtered = posts.filter((p) => !p.pinned && p.type === filter);
    return [...pinned, ...filtered];
  }, [posts, filter]);

  const handleSubmit = () => {
    if (!body.trim() || createMutation.isPending) return;
    createMutation.mutate();
  };

  const bodyCount = body.length;
  const overLimit = bodyCount > MAX_BODY;

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto w-full">
      <PageHeader
        eyebrow="Studio wall"
        eyebrowIcon={MessageSquare}
        title="Community"
        subtitle="Updates, questions, inspiration and showcases from the atelier."
        actions={
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#832138]/8 border border-[#832138]/15 text-[#832138]">
            <MessageSquare className="w-4 h-4" />
          </span>
        }
      />

      {/* Composer */}
      <SectionCard
        title="Share something"
        className="lg:sticky lg:top-6 z-10 mb-5 animate-fade-in-up"
        bodyClassName="grid gap-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cm-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CommunityPostType)}
            >
              <SelectTrigger id="cm-type" className="w-full bg-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Update
                  </span>
                </SelectItem>
                <SelectItem value="question">
                  <span className="inline-flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Question
                  </span>
                </SelectItem>
                <SelectItem value="inspiration">
                  <span className="inline-flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Inspiration
                  </span>
                </SelectItem>
                <SelectItem value="showcase">
                  <span className="inline-flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Showcase
                  </span>
                </SelectItem>
                {isOwner && (
                  <SelectItem value="announcement">
                    <span className="inline-flex items-center gap-2">
                      <Megaphone className="w-3.5 h-3.5" />
                      Announcement
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cm-title" className="justify-between">
              <span>Title</span>
              <span className="text-stone-400 font-normal text-[11px]">
                optional
              </span>
            </Label>
            <Input
              id="cm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a headline"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="cm-body">Message</Label>
          <Textarea
            id="cm-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update, ask a question, post inspiration or showcase a piece…"
            rows={3}
            className="resize-none min-h-[88px]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span
            className={cn(
              "text-[11px] tabular-nums",
              overLimit ? "text-[#832138] font-medium" : "text-stone-400"
            )}
          >
            {bodyCount}/{MAX_BODY}
          </span>
          <PremiumButton
            onClick={handleSubmit}
            loading={createMutation.isPending}
            disabled={!body.trim() || overLimit}
            size="md"
          >
            <Send className="w-4 h-4" />
            Post
          </PremiumButton>
        </div>
      </SectionCard>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-5 animate-fade-in-up">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "px-3.5 h-8 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap",
                active
                  ? "bg-[#832138] text-white border-[#832138]"
                  : "bg-white text-stone-500 border-[#EEDFE3] hover:border-[#832138]/30 hover:text-[#2F151B] hover:bg-[#FAF0F2]"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <SectionCard>
          <EmptyState
            icon={MessageSquare}
            title="Couldn't load posts"
            description="Please check your connection and try again."
            action={
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["community"] })
                }
              >
                Retry
              </PremiumButton>
            }
          />
        </SectionCard>
      ) : visiblePosts.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={MessageSquare}
            title="No posts yet"
            description="Start the conversation — share an update, question, or showcase."
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4">
          {visiblePosts.map((post, idx) => (
            <PostCard
              key={post.id}
              post={post}
              idx={idx}
              liked={likedSet.has(post.id)}
              likePending={
                likeMutation.isPending && likeMutation.variables === post.id
              }
              onToggleLike={() => likeMutation.mutate(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── post card ─────────────────────────────

function PostCard({
  post,
  idx,
  liked,
  likePending,
  onToggleLike,
}: {
  post: CommunityPost;
  idx: number;
  liked: boolean;
  likePending: boolean;
  onToggleLike: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentOpen, setCommentOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const typeMeta = TYPE_META[post.type] ?? TYPE_META.update;
  const role = roleChip(post.authorRole);
  const TypeIcon = typeMeta.icon;
  const likeCount = post._count?.likes ?? 0;

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not signed in.");
      return apiPost(`/api/community/${post.id}/comments`, {
        authorId: user.id,
        authorName: user.fullName,
        body: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Comment posted.");
      setDraft("");
    },
    onError: (e) => {
      toast.error("Couldn't post comment.", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });

  const submitComment = () => {
    const text = draft.trim();
    if (!text || commentMutation.isPending) return;
    commentMutation.mutate(text);
  };

  return (
    <article
      className="surface-premium border border-[#EEDFE3] rounded-xl elevate-sm lift animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full bg-[#832138] text-white flex items-center justify-center font-display font-semibold text-sm shrink-0 elevate-sm"
              aria-hidden
            >
              {initialOf(post.authorName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[#2F151B] truncate">
                  {post.authorName}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wide border rounded font-medium",
                    role.className
                  )}
                >
                  {role.label}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {timeAgo(post.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium border rounded",
                typeMeta.chip
              )}
            >
              <TypeIcon className="w-3 h-3" />
              {typeMeta.label}
            </span>
            {post.pinned && (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 border border-amber-200 text-amber-600"
                title="Pinned"
                aria-label="Pinned post"
              >
                <Pin className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-3">
          {post.title && (
            <h3 className="font-display font-semibold text-[#2F151B] text-lg leading-snug mb-1">
              {post.title}
            </h3>
          )}
          <p className="text-sm text-[#2F151B] whitespace-pre-wrap leading-relaxed">
            {post.body}
          </p>
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-[#EEDFE3] shadow-inner bg-[#FAF0F2]">
            <img
              src={post.imageUrl}
              alt=""
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        {/* Actions row */}
        <div className="mt-3 flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleLike}
            disabled={likePending}
            aria-pressed={liked}
            aria-label={liked ? "Unlike post" : "Like post"}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-all duration-200 border",
              liked
                ? "bg-[#832138]/8 text-[#832138] border-[#832138]/20"
                : "bg-white text-stone-500 border-[#EEDFE3] hover:border-[#832138]/30 hover:text-[#2F151B] hover:bg-[#FAF0F2]",
              likePending && "opacity-60 cursor-wait"
            )}
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5 transition-all",
                liked && "fill-[#832138] text-[#832138]"
              )}
            />
            <span className="tabular-nums">{likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setCommentOpen((v) => !v)}
            aria-pressed={commentOpen}
            aria-label="Toggle comments"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-all duration-200 border",
              commentOpen
                ? "bg-[#2F151B]/5 text-[#2F151B] border-[#EEDFE3]"
                : "bg-white text-stone-500 border-[#EEDFE3] hover:border-[#832138]/30 hover:text-[#2F151B] hover:bg-[#FAF0F2]"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="tabular-nums">{post.comments.length}</span>
          </button>
        </div>
      </div>

      {/* Comments */}
      {(post.comments.length > 0 || commentOpen) && (
        <div className="border-t border-[#EEDFE3]/70 bg-[#FAF0F2]/40 px-5 py-4">
          {post.comments.length > 0 && (
            <ul className="space-y-3 mb-3">
              {post.comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full bg-[#832138]/85 text-white flex items-center justify-center text-[10px] font-medium shrink-0"
                    aria-hidden
                  >
                    {initialOf(c.authorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[#2F151B]">
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {commentOpen && (
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                className="h-9 bg-white"
              />
              <PremiumButton
                size="sm"
                onClick={submitComment}
                loading={commentMutation.isPending}
                disabled={!draft.trim()}
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </PremiumButton>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
