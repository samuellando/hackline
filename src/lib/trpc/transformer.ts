import Timeline from '$lib/Timeline';
import State from '$lib/State';
import SuperJSON, { deserialize, parse, serialize, stringify } from 'superjson';

SuperJSON.registerCustom<Timeline, string>(
	{
		isApplicable: (v): v is Timeline => v instanceof Timeline,
		serialize: (v) => stringify(v.toObject()),
		deserialize: (v) => Timeline.fromSerializable(parse(v))
	},
	'Timeline'
);

SuperJSON.registerCustom<State, string>(
	{
		isApplicable: (v): v is State => v instanceof State,
		serialize: (v) => stringify(v.toObject()),
		deserialize: (v) => {
			return State.fromSerializable(parse(v));
		}
	},
	'State'
);

export default SuperJSON;
export { serialize, deserialize, stringify, parse };
