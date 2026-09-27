import { redirect } from "next/navigation";

// A common typo for /admin/videos: send it to the right page.
export default function AdminVideoRedirect(): never {
  redirect("/admin/videos");
}
