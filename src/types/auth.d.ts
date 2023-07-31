import type { DefaultSession } from '@auth/core/types';

export declare module '@auth/core/types' {
	interface Session {
		user: {
			id?: string;
		} & DefaultSession['user'];
	}
}
