import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { SiteShell, eyebrow } from "@/components/site/SiteShell";
import { loadWebsiteContent } from "@/lib/website-content.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Our story",
  description: "Why Sewsiness exists: the brand behind the business of sewing.",
};

export default async function OurStoryPage() {
  const { story, site } = await loadWebsiteContent();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        {story.image && (
          <img src={story.image} fetchPriority="high" alt={story.imageAlt} className="mb-10 aspect-[4/3] w-full rounded-[2rem] object-cover sm:aspect-[16/10]" />
        )}
        <p className={eyebrow}>Our story</p>
        <div className={`mt-4 space-y-6 text-[1.05rem] leading-8 text-[#5f4b50] [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:tracking-tight [&_h2]:text-4xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-[#35121d] sm:[&_h2]:text-5xl [&_strong]:text-[#800020] [&_a]:font-semibold [&_a]:text-[#800020] [&_a]:underline`}>
          <ReactMarkdown>{story.body}</ReactMarkdown>
        </div>
        {story.gallery.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {story.gallery.map((g, i) => <img key={`${g.src}-${i}`} src={g.src} alt={g.alt} loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />)}
          </div>
        )}
        <a href="/#products" className="mt-10 inline-flex text-sm font-bold text-[#800020] underline">See what {site.name} offers</a>
      </article>
    </SiteShell>
  );
}
