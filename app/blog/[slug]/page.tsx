import { notFound } from "next/navigation";
import { blogPosts } from "../../../lib/blogData";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <article className="resultBox">
          <p className="sectionLabel">{post.category}</p>

          <h1>{post.title}</h1>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "24px",
            }}
          >
            {post.date}
          </p>

          <div
            style={{
              lineHeight: "1.9",
              fontSize: "1.05rem",
              whiteSpace: "pre-line",
            }}
          >
            {post.content}
          </div>
        </article>
      </div>
    </main>
  );
}