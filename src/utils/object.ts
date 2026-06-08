type Entry<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T];

export function objEntries<T extends object>(obj: T): Entry<T>[] {
	return Object.entries(obj) as Entry<T>[];
};

// export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;