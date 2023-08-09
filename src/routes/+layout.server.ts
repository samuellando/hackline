import type { LayoutServerLoad } from './$types';
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import transformer from '$lib/trpc/transformer';
import { getStripeInfo } from '$lib/server/stripe';
import type { stripeInfo } from '$lib/types';

export const load: LayoutServerLoad = async (event) => {
	const caller = router.createCaller(await createContext(event));
	const now = new Date();
	const state = await caller.getState({
		start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
		end: now
	});
	// Get some information from the session.
	const session = await event.locals.getSession();
	let stripeInfo: stripeInfo = {
		customerId: null,
		paymentStatus: 'inactive',
		createdAt: null
	};
	if (session?.user.id) {
		stripeInfo = await getStripeInfo(session.user.id);
	}

	return {
		session: session,
		state: transformer.stringify(state),
		stripeInfo: stripeInfo
	};
};
