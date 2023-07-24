import Timeline from '$lib/Timeline';
import { State } from '$lib/types';
import SuperJSON, { deserialize, parse, serialize, stringify } from 'superjson';

SuperJSON.registerCustom<Timeline, string>(
    {
        isApplicable: (v): v is Timeline => v instanceof Timeline || (v instanceof Object && 'intervals' in v),
        serialize: (v) => stringify(v),
        deserialize: (v) => Timeline.fromSerializable(parse(v)),
    },
    'Timeline'
);

SuperJSON.registerCustom<State, string>(
    {
        isApplicable: (v): v is State => v instanceof State || (v instanceof Object && 'timeline' in v && 'settings' in v && 'running' in v),
        serialize: (v) => stringify(v),
        deserialize: (v) => State.fromSerializable(parse(v)),
    },
    'State'
);

export default SuperJSON;
export { serialize, deserialize, stringify, parse };
