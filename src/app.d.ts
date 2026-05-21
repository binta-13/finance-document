declare global {
	interface D1PreparedStatement {
		bind(...params: unknown[]): D1PreparedStatement;
		first<T = unknown>(): Promise<T | null>;
		all<T = unknown>(): Promise<{ results: T[] }>;
		run(): Promise<{ success: boolean }>;
	}

	interface D1Database {
		prepare(sql: string): D1PreparedStatement;
	}

	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				CLOUDINARY_CLOUD_NAME: string;
				CLOUDINARY_UPLOAD_PRESET: string;
				OPENROUTER_API_KEY: string;
			};
		}
	}
}

export {};
