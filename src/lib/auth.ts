import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@infra/db/prisma/prismaClient";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [
    Google({
        clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Dev Login (only in development)
    ...(process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
        ? [
            Credentials({
                id: "dev",
                name: "Dev Login",
                credentials: {
                    username: { label: "Username", type: "text" },
                    password: { label: "Password", type: "password" }
                },
                async authorize(credentials: any) {
                    if (credentials?.username === "admin@example.com" && credentials?.password === "admin") {
                        return {
                            id: "dev-user-1",
                            name: "Dev User",
                            email: "admin@example.com",
                            image: "https://i.pravatar.cc/150?u=dev-user-1"
                        };
                    }
                    return null;
                },
            }),
        ]
        : []),
    // Production Credentials (Email/Password) - Placeholder for now
    Credentials({
        id: "credentials",
        name: "Email",
        credentials: { email: {}, password: {} },
        async authorize(creds) {
            if (!creds?.email || !creds?.password) return null;

            const user = await prisma.user.findUnique({
                where: { email: String(creds.email) }
            });

            if (!user || !(user as any).passwordHash) return null;

            // Dynamically import bcrypt to avoid build issues on Edge? No, we are Node runtime here.
            const bcrypt = await import('bcryptjs');
            const isValid = await bcrypt.compare(String(creds.password), (user as any).passwordHash);

            if (!isValid) return null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            };
        },
    }),
];

export const providerMap = providers.map((provider) => {
    if (typeof provider === "function") {
        const providerData = provider();
        return { id: providerData.id, name: providerData.name };
    } else {
        return { id: provider.id, name: provider.name };
    }
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers,
    session: { strategy: "jwt" },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
    },
    pages: {
        signIn: '/signin',
        error: '/error',
    },
    events: {
        async createUser({ user }) {
            if (!user.id) return;
            await prisma.userProfile.create({
                data: {
                    userId: user.id,
                    displayName: user.name || "User",
                    profileCompleted: false,
                    // username is null by default
                }
            });
        }
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
