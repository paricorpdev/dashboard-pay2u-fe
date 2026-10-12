import { redirect } from "next/navigation";

export default function Home() {
  // The client-side AuthProvider handles the real session check on the
  // target page; here we simply send visitors to the app entry point.
  redirect("/dashboard");
}
