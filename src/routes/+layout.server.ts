import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    console.log(event.locals);
  return {
    session: await event.locals.getSession(),
  };
};
