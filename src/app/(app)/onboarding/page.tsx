import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams?: { callbackUrl?: string };
}) {
    const session = await auth();
    const callbackUrl = searchParams?.callbackUrl || "/";

    if (!session?.user) {
        redirect(`/signin?callbackUrl=${encodeURIComponent(`/onboarding?callbackUrl=${callbackUrl}`)}`);
    }

    async function saveProfile(formData: FormData) {
        "use server";
        const displayName = String(formData.get("displayName") || "").trim();

        // Use absolute URL for fetch in server component if needed, or better yet, call a controller/use-case directly.
        // However, existing pattern uses fetch to local API.
        // Auth URL might be needed.
        const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'; // Fallback

        // Note: The user provided code uses `process.env.AUTH_URL ?? ""`.
        // I should follow their pattern but be safe.

        const res = await fetch(`${process.env.AUTH_URL || 'http://localhost:3000'}/api/user/profile`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Forward cookie for auth
                "Cookie": (await import("next/headers")).headers().get("cookie") || ""
            },
            body: JSON.stringify({ displayName }),
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error("Falha ao guardar perfil.");
        }

        redirect(callbackUrl);
    }

    return (
        <div className="relative min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <h1 className="text-xl font-semibold">Bem-vindo ✨</h1>
                    <p className="text-sm text-gray-600">Só precisamos de um nome para começar.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form action={saveProfile} className="space-y-3">
                        <Input
                            name="displayName"
                            label="Display name"
                            placeholder="e.g. PomodoroMaster"
                            minLength={2}
                            maxLength={30}
                            required
                        />
                        <Button className="w-full" type="submit">
                            Guardar e continuar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
