import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import type { Handle } from '@sveltejs/kit';
import { createTRPCHandle } from 'trpc-sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0Provider from '@auth/core/providers/auth0';
import { env } from '$env/dynamic/private';

export const authHandle = SvelteKitAuth({
	trustHost: true,
	callbacks: {
		jwt: async ({ user, token }) => {
			if (user) {
				token.uid = user.id as string;
			}
			return token;
		},
		session: async ({ session, token }) => {
			if (session?.user) {
				session.user.id = token.uid as string;
			}
			return session;
		}
	},
	providers: [
		Auth0Provider({
			clientId: env.AUTH0_ID,
			clientSecret: env.AUTH0_SECRET,
			issuer: env.AUTH0_ISSUER
		})
	],
	secret: env.AUTH_SECRET,
	session: {
		strategy: 'jwt'
	}
});

export const trpcHandle: Handle = createTRPCHandle({ router, createContext });

export const handle = sequence(authHandle, trpcHandle);
