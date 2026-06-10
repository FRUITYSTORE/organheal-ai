import Link from "next/link";
import { blogPosts } from "../../lib/blogData";

export const metadata = {
  title: "Health Intelligence Blog",
  description:
    "Educational articles about organ health, lab results, wellness trends, and preventive health intelligence.",
};

export default function BlogPage() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL BLOG</p>

          <h1>Health Intelligence Articles</h1>

          <p>
            Learn about organ health, lab results, wellness tracking, and
            preventive health insights through simple educational articles.
          </p>
        </section>

        <section className="chatWindow">
          <div className="blogGrid">
            {blogPosts.map((post) => (
              <article key={post.slug} className="blogCard">
                <p className="blogCategory">{post.category}</p>

                <h2>{post.title}</h2>

                <p>{post.excerpt}</p>

                <div className="blogCardFooter">
                  <span>{post.date}</span>

                  <Link href={`/blog/${post.slug}`} className="blogReadMore">
                    Read Article
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}