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

export interface settings {
  [key: string]: any;
}

export interface apiKey {
  apiKey: string;
}
