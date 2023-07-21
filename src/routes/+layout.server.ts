import type { LayoutServerLoad } from "./$types";
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';

export const load: LayoutServerLoad = async (event) => {
    let caller = router.createCaller(await createContext(event));
    return {
        session: await event.locals.getSession(),
        greeting: caller.greeting("Server"),
        state: JSON.stringify(await caller.getState({ start: 0, end: 0 })),
    };
};
