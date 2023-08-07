import type { RequestEvent } from '@sveltejs/kit';
import type { inferAsyncReturnType } from '@trpc/server';
import { getUser } from '$lib/server/apiKey';

export async function createContext(event: RequestEvent) {
	const session = await event.locals.getSession();
	let user;
	if (!session?.user) {
		const apiKey = event.request.headers.get('api-key');
		if (!apiKey) {
			user = null;
		} else {
			user = await getUser(apiKey);
		}
	} else {
		user = session.user.id;
	}

	return {
		user
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
