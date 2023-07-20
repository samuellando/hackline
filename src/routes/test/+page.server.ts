import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let caller = router.createCaller(await createContext(event));
    return {
        greeting: caller.greeting("Server"),
        state: JSON.stringify(caller.getState({ start: 0, end: 0 })),
    };
}
