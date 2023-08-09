import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getStripeInfo } from '$lib/server/stripe';

export const load: LayoutServerLoad = async (event) => {
    const { session } = await event.parent();
    if (!session?.user) throw redirect(303, '/');
    if (!session.user?.id) throw Error("User ID not found");
    const stripeInfo = await getStripeInfo(session.user.id);
    if (event.url.pathname != '/app/payment' && stripeInfo.paymentStatus === 'inactive') {
        throw redirect(303, '/app/payment');
    } else {
        return {
            stripeInfo
        }
    }
};
