import { Timeline } from '$lib/Timeline';
import { State } from '$lib/types';
import type { running, settings } from '$lib/types';
import SuperJSON, { deserialize, parse, serialize, stringify } from 'superjson';

SuperJSON.registerCustom<Timeline, string>(
  {
    isApplicable: (v): v is Timeline => typeof v.intervals !== undefined,
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => Timeline.fromSerializable(JSON.parse(v)),
  },
  'Timeline'
);

SuperJSON.registerCustom<State, string>(
  {
    isApplicable: (v): v is State => typeof v.timeline !== undefined && typeof v.running !== undefined && typeof v.settings !== undefined,
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => State.fromSerializable(JSON.parse(v)),
  },
  'State'
);

SuperJSON.registerCustom<running, string>(
  {
    isApplicable: (v): v is running => typeof v.title !== undefined && typeof v.start !== undefined,
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => JSON.parse(v),
  },
  'running'
);

SuperJSON.registerCustom<settings, string>(
  {
    isApplicable: (v): v is settings => typeof v !== undefined,
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => JSON.parse(v),
  },
  'settings'
);

export default SuperJSON;
export { serialize, deserialize, stringify, parse };
