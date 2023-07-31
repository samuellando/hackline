export interface interval {
	readonly title: string;
	readonly start: Date;
	readonly end: Date;
	readonly id: number;
}

export interface running {
	readonly title: string;
	readonly start: Date;
	readonly end?: Date;
	readonly fallback?: running;
}

export type settingsValue =
	| {
			readonly [key: string]: settingsValue | string;
	  }
	| string
	| number
	| boolean;

export interface settings {
	readonly [key: string]: settingsValue;
}

export interface apiKey {
	apiKey: string;
}

export type palette = {
	primary: string;
	secondary: string;
};
