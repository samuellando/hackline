export interface interval {
	title: string;
	start: Date;
	end: Date;
	id: number;
}

export interface running {
	title: string;
	start: Date;
	end?: Date;
	fallback?: running;
}

export type settingsValue = { [key: string]: settingsValue | string } | string | number | boolean;

export interface settings {
	[key: string]: settingsValue;
}

export interface apiKey {
	apiKey: string;
}

export type palette = {
	primary: string;
	secondary: string;
};
