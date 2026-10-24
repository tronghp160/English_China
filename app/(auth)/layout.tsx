import { AuthShell } from "@/components/auth/auth-shell";

/** One frame for sign-in, sign-up and the password pages: the blue panel (or band) with Bin stays while the page changes. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
