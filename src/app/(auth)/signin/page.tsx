import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { providerMap, signIn } from "@/lib/auth"; // Corrected import path based on inspection
import { AuthError } from "next-auth";

type Props = {
    searchParams?: { callbackUrl?: string; error?: string };
};

function humanError(code?: string) {
    if (!code) return null;
    const map: Record<string, string> = {
        OAuthSignin: "Failed to sign in with provider.",
        OAuthCallback: "Provider callback failed.",
        CredentialsSignin: "Invalid email or password.",
        AccessDenied: "Access denied.",
    };
    return map[code] ?? "Unable to sign in. Please try again.";
}

export default async function SignInPage({ searchParams }: Props) {
    const callbackUrl = searchParams?.callbackUrl ?? "/";
    const errorMsg = humanError(searchParams?.error);

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <h1 className="text-xl font-semibold">Sign In</h1>
                <p className="text-sm text-gray-600">Sync progress, profile and sessions across devices.</p>
            </CardHeader>

            <CardContent className="space-y-4">
                {errorMsg ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {errorMsg}
                    </div>
                ) : null}

                {/* Providers (Google / Dev / etc) */}
                <div className="space-y-2">
                    {providerMap
                        .filter((p) => p.id !== "credentials")
                        .map((provider) => (
                            <form
                                key={provider.id}
                                action={async () => {
                                    "use server";
                                    try {
                                        await signIn(provider.id, { redirectTo: callbackUrl });
                                    } catch (e) {
                                        if (e instanceof AuthError) throw e;
                                        throw e;
                                    }
                                }}
                            >
                                <Button type="submit" variant="secondary" className="w-full">
                                    Continue with {provider.name}
                                </Button>
                            </form>
                        ))}
                </div>

                {/* Credentials Login */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-black/10" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white/60 px-3 text-xs text-gray-500">or</span>
                    </div>
                </div>

                <form
                    className="space-y-3"
                    action={async (formData) => {
                        "use server";
                        try {
                            // Auth.js: passar o FormData diretamente é o caminho “standard” no custom sign-in
                            await signIn("credentials", formData);
                        } catch (e) {
                            if (e instanceof AuthError) throw e;
                            throw e;
                        }
                    }}
                >
                    <input type="hidden" name="redirectTo" value={callbackUrl} />
                    <Input name="email" type="email" label="Email" placeholder="you@example.com" required />
                    <Input name="password" type="password" label="Password" placeholder="••••••••" required />
                    <Button type="submit" className="w-full">Sign In</Button>
                </form>

                <p className="text-xs text-gray-600">
                    Don't have an account?{" "}
                    <a className="underline hover:text-gray-900" href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
                        Create Account
                    </a>
                </p>
            </CardContent>
        </Card>
    );
}
