import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@infra/db/prisma/prismaClient";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        }),
        // Dev-only credentials provider to bypass OAuth requirement
        ...((process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) ?
            [require("next-auth/providers/credentials").default({
                name: 'Dev Login',
                credentials: {
                    username: { label: "Username", type: "text", placeholder: "admin@example.com" },
                    password: { label: "Password", type: "password", placeholder: "admin" }
                },
                async authorize(credentials: any) {
                    if (credentials.username && credentials.password === 'admin') {
                        return {
                            id: 'dev-user-1',
                            name: 'Dev User',
                            email: credentials.username,
                            image: 'https://i.pravatar.cc/150?u=dev-user-1'
                        };
                    }
                    return null;
                }
            })] : []),
    ],
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
        signIn: '/auth/signin',
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
