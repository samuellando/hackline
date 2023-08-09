import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const data = await event.parent();
	if (!data.session?.user) throw redirect(303, '/');
	if (event.url.pathname != '/app/payment' && data.stripeInfo.paymentStatus === 'inactive') {
		throw redirect(303, '/app/payment');
	} else {
		return data;
	}
};
