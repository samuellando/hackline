import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import type { Handle } from '@sveltejs/kit';
import { createTRPCHandle } from 'trpc-sveltekit';
import { sequence } from '@sveltejs/kit/hooks';


import { SvelteKitAuth } from "@auth/sveltekit";
import Auth0Provider from "@auth/core/providers/auth0";
import { AUTH0_ID, AUTH0_SECRET, AUTH0_ISSUER, AUTH_SECRET } from "$env/static/private";

export const authHandle = SvelteKitAuth({
    callbacks: {
        session: async ({ session, token }) => {
            if (session?.user) {
                session.user.id = token.uid;
            }
            return session;
        },
        jwt: async ({ user, token }) => {
            if (user) {
                token.uid = user.id;
            }
            return token;
        },
    },
    providers: [
        Auth0Provider({
            clientId: AUTH0_ID,
            clientSecret: AUTH0_SECRET,
            issuer: AUTH0_ISSUER,
        }),
    ],
    secret: AUTH_SECRET,
    session: {
        strategy: 'jwt',
    },
});

export const trpcHandle: Handle = createTRPCHandle({ router, createContext });

export const handle = sequence(authHandle, trpcHandle);
