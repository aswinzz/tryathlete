"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    await signIn("credentials", { email, password, redirect: false });
    router.push("/connect");
  }

  return (
    <main className="flex flex-col min-h-dvh px-5 pt-16 pb-10">
      <Link
        href="/"
        className="text-sm text-[var(--text-2)] mb-10 inline-block hover:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Create account.</h1>
        <p className="text-sm text-[var(--text-2)] mt-1">
          Start sharing your workouts
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <Input
          label="Name"
          type="text"
          placeholder="Aswin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
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
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          error={error}
        />

        <Button type="submit" variant="accent" size="lg" fullWidth loading={loading} className="mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-2)] mt-8">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="text-white font-semibold hover:text-[var(--accent)] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
