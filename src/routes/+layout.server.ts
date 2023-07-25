import type { LayoutServerLoad } from "./$types";
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import transformer from '$lib/trpc/transformer';

export const load: LayoutServerLoad = async (event) => {
    let caller = router.createCaller(await createContext(event));
    let now = new Date();
    let state = await caller.getState({ start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now });
    return {
        session: await event.locals.getSession(),
        state: transformer.stringify(state),
    };
};
