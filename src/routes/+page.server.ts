import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { session } = await event.parent();
	if (session?.user) throw redirect(303, '/app/timeline');
};
