"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function SignupForm() {
    const router = useRouter();
    const sp = useSearchParams();
    const callbackUrl = sp.get("callbackUrl") || "/";

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const payload = {
            displayName: String(formData.get("displayName") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            password: String(formData.get("password") || ""),
            confirm: String(formData.get("confirm") || ""),
        };

        if (payload.password !== payload.confirm) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Failed to create account.");

            // After register, redirect to signin
            router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        } catch (e: any) {
            setError(e.message || "Unexpected error.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <h1 className="text-xl font-semibold">Create Account</h1>
                <p className="text-sm text-gray-600">One account = profile + rankings + social features.</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <form action={onSubmit} className="space-y-3">
                    <Input name="displayName" label="Display Name" placeholder="Tom" minLength={2} maxLength={30} required />
                    <Input name="email" type="email" label="Email" placeholder="you@example.com" required />
                    <Input name="password" type="password" label="Password" required />
                    <Input name="confirm" type="password" label="Confirm Password" required />
                    <Button type="submit" className="w-full" loading={loading}>
                        Create Account
                    </Button>
                </form>

                <p className="text-xs text-gray-600">
                    Already have an account?{" "}
                    <a className="underline hover:text-gray-900" href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
                        Sign In
                    </a>
                </p>
            </CardContent>
        </Card>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
            <SignupForm />
        </Suspense>
    );
}
