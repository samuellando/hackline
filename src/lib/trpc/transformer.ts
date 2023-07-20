import { Timeline } from '$lib/Timeline';
import { State } from '$lib/types';
import type { settings, running } from '$lib/types';
import SuperJSON, { deserialize, parse, serialize, stringify } from 'superjson';

SuperJSON.registerCustom<Timeline, string>(
    {
        isApplicable: (v): v is Timeline => v instanceof Timeline || (v instanceof Object && 'intervals' in v),
        serialize: (v) => JSON.stringify(v),
        deserialize: (v) => Timeline.fromSerializable(JSON.parse(v)),
    },
    'Timeline'
);

SuperJSON.registerCustom<State, string>(
    {
        isApplicable: (v): v is State => v instanceof State || (v instanceof Object && 'timeline' in v && 'settings' in v && 'running' in v),
        serialize: (v) => JSON.stringify(v),
        deserialize: (v) => State.fromSerializable(JSON.parse(v)),
    },
    'State'
);

export default SuperJSON;
export { serialize, deserialize, stringify, parse };
