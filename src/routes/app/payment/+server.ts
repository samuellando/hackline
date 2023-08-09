import { updateStripeInfo } from '$lib/server/stripe';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';

if (!env.STRIPE_SECRET) throw new Error('Stripe secret not set');
if (!env.STRIPE_ENDPOINT_SECRET) throw new Error('Stripe endpoint secret not set');

const endpointSecret = env.STRIPE_ENDPOINT_SECRET;
const stripe = new Stripe(env.STRIPE_SECRET, {
	apiVersion: '2022-11-15'
});

async function getEvent(event: RequestEvent) {
	const IPS = [
		'3.18.12.63',
		'3.130.192.231',
		'13.235.14.237',
		'13.235.122.149',
		'18.211.135.69',
		'35.154.171.200',
		'52.15.183.38',
		'54.88.130.119',
		'54.88.130.237',
		'54.187.174.169',
		'54.187.205.235',
		'54.187.216.72',
		'127.0.0.1',
		'::1'
	];
	if (!IPS.includes(event.getClientAddress())) throw new Error('IP not allowed');
	const sig = event.request.headers.get('stripe-signature');
	if (!sig) throw new Error('No signature');
	return stripe.webhooks.constructEvent(await event.request.text(), sig, endpointSecret);
}
/*
 * Stripe webhook.
 */
export async function POST(event: RequestEvent) {
	let stripeEvent;
	try {
		stripeEvent = await getEvent(event);
	} catch (err) {
		console.log(err);
		return new Response('Invalid Request', { status: 400 });
	}

	switch (stripeEvent.type) {
		case 'checkout.session.completed': {
			const session = stripeEvent.data.object as Stripe.Checkout.Session;
			if (!session.metadata) return new Response('No metadata', { status: 400 });
			const userId = session.metadata.userId;
			if (!userId) return new Response('No user id', { status: 400 });
			if (typeof session.customer !== 'string')
				return new Response('No customer id', { status: 400 });
			const customerId = session.customer;
			const paymentStatus = 'active';
			await updateStripeInfo({ customerId, paymentStatus }, userId);
			break;
		}
		case 'invoice.paid': {
			const invoice = stripeEvent.data.object as Stripe.Invoice;
			if (typeof invoice.customer !== 'string')
				return new Response('No customer id', { status: 400 });
			const customerId = invoice.customer;
			const paymentStatus = 'active';
			await updateStripeInfo({ customerId, paymentStatus });
			break;
		}
		case 'invoice.payment_failed': {
			const invoice = stripeEvent.data.object as Stripe.Invoice;
			if (typeof invoice.customer !== 'string')
				return new Response('No customer id', { status: 400 });
			const customerId = invoice.customer;
			const paymentStatus = 'inactive';
			await updateStripeInfo({ customerId, paymentStatus });
			break;
		}
		case 'customer.subscription.deleted': {
			const subscription = stripeEvent.data.object as Stripe.Subscription;
			if (typeof subscription.customer !== 'string')
				return new Response('No customer id', { status: 400 });
			const customerId = subscription.customer;
			const paymentStatus = 'inactive';
			await updateStripeInfo({ customerId, paymentStatus });
			break;
		}
		default:
			// Unexpected event type
			break;
	}

	return new Response('{}');
}
