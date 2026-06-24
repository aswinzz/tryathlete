"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex flex-col min-h-dvh px-6 pt-14 pb-10">
      <Link
        href="/"
        className="text-sm text-[var(--text-2)] mb-12 inline-block hover:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-black text-white">Welcome back.</h1>
        <p className="text-sm text-[var(--text-2)] mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          error={error}
        />

        <Button type="submit" variant="accent" size="lg" fullWidth loading={loading} className="mt-4">
          Sign In
        </Button>

        <p className="mt-auto text-center text-sm text-[var(--text-2)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-white font-semibold hover:text-[var(--accent)] transition-colors"
          >
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
