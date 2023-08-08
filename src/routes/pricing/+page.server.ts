import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Stripe from 'stripe';
import { getStripeInfo } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
    const {stripeInfo}  = await getInfo(event);
    return { stripeInfo };
};

const stripe = new Stripe(env.STRIPE_SECRET, {
    apiVersion: '2022-11-15',
});

async function getInfo(event) {
    const session = await event.locals.getSession();
    if (session?.user.id) {
        return {userId: session.user.id, stripeInfo: await getStripeInfo(session.user.id)};
    } else {
        throw redirect(303, '/');
    }
}

export const actions = {
    subscribe: async (event) => {
        const {userId, stripeInfo}  = await getInfo(event);
        if (stripeInfo.paymentStatus === 'active') throw redirect(303, '/timeline');
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: 'price_1Nct7XAal153k9FeEbSLyUwr',
                    quantity: 1,
                },
            ],
            customer: stripeInfo.customerId?stripeInfo.customerId:undefined,
            mode: 'subscription',
            metadata: {
                userId: userId
            },
            success_url: `${event.url.origin}/pricing`,
            cancel_url: `${event.url.origin}/pricing`,
        });

        if (!session?.url) throw redirect(303, '/');
        throw redirect(303, session.url);
    },
    adopt: async (event) => {
        const {stripeInfo, userId} = await getInfo(event);
        if (stripeInfo.paymentStatus === 'active') throw redirect(303, '/timeline');
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: 'price_1NcvLaAal153k9Fe48WQOHDg',
                    quantity: 1,
                },
            ],
            customer: stripeInfo.customerId?stripeInfo.customerId:undefined,
            metadata: {
                userId: userId
            },
            mode: 'payment',
            success_url: `${event.url.origin}/pricing`,
            cancel_url: `${event.url.origin}/pricing`,
        });

        if (!session?.url) throw redirect(303, '/');
        throw redirect(303, session.url);
    },
    dashboard: async (event) => {
        // Check if the user is already subscribed.
        const {stripeInfo} = await getInfo(event);
        if (!stripeInfo.customerId) throw redirect(303, '/');
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeInfo.customerId,
            return_url: `${event.url.origin}/pricing`,
        });

        throw redirect(303, session.url);
    }
};
