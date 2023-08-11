import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { getStripeInfo } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

let stripe: Stripe;

if (env.STRIPE_SECRET) {
	stripe = new Stripe(env.STRIPE_SECRET, {
		apiVersion: '2022-11-15'
	});
}

async function getInfo(event: RequestEvent) {
	const session = await event.locals.getSession();
	if (session?.user.id) {
		return { userId: session.user.id, stripeInfo: await getStripeInfo(session.user.id) };
	} else {
		throw redirect(303, '/');
	}
}

export const actions = {
	subscribe: async (event: RequestEvent) => {
		const { userId, stripeInfo } = await getInfo(event);
		if (stripeInfo.paymentStatus === 'active') throw redirect(303, '/timeline');
		const session = await stripe.checkout.sessions.create({
			line_items: [
				{
					price: 'price_1NcanJAal153k9FeWz00x1Ej',
					quantity: 1
				}
			],
			customer: stripeInfo.customerId ? stripeInfo.customerId : undefined,
			mode: 'subscription',
			metadata: {
				userId: userId
			},
			success_url: `${event.url.origin}/#pricing`,
			cancel_url: `${event.url.origin}/#pricing`
		});

		if (!session?.url) throw redirect(303, '/');
		throw redirect(303, session.url);
	},
	adopt: async (event: RequestEvent) => {
		const { stripeInfo, userId } = await getInfo(event);
		if (stripeInfo.paymentStatus === 'active') throw redirect(303, '/timeline');
		const session = await stripe.checkout.sessions.create({
			line_items: [
				{
					price: 'price_1NcanJAal153k9FeFSkfgzTi',
					quantity: 1
				}
			],
			customer: stripeInfo.customerId ? stripeInfo.customerId : undefined,
			customer_creation: 'always',
			metadata: {
				userId: userId
			},
			mode: 'payment',
			success_url: `${event.url.origin}/#pricing`,
			cancel_url: `${event.url.origin}/#pricing`
		});

		if (!session?.url) throw redirect(303, '/');
		throw redirect(303, session.url);
	},
	dashboard: async (event: RequestEvent) => {
		// Check if the user is already subscribed.
		const { stripeInfo } = await getInfo(event);
		if (!stripeInfo.customerId) throw redirect(303, '/');
		const session = await stripe.billingPortal.sessions.create({
			customer: stripeInfo.customerId,
			return_url: `${event.url.origin}/app/account`
		});

		throw redirect(303, session.url);
	}
};
