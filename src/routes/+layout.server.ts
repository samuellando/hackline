import type { LayoutServerLoad } from "./$types";
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import transformer from '$lib/trpc/transformer';

export const load: LayoutServerLoad = async (event) => {
    let caller = router.createCaller(await createContext(event));
    let state = await caller.getState({ start: 0, end: 0 });
    return {
        session: await event.locals.getSession(),
        state: transformer.stringify(state),
    };
};
