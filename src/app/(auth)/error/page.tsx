"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AuthErrorPage() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <h1 className="text-xl font-semibold">Oops…</h1>
                <p className="text-sm text-gray-600">Algo correu mal no login.</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <Button className="w-full" variant="secondary" onClick={() => (window.location.href = "/signin")}>
                    Voltar ao Sign-in
                </Button>
            </CardContent>
        </Card>
    );
}
