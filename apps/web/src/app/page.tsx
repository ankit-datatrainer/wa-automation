import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware sends signed-out visitors to /login; this covers the signed-in case.
  redirect("/dashboard");
}
