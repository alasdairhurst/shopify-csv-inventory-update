export type Enumerate<
  N extends number,
  Acc extends number[] = []
> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;

export type IntRange<F extends number, T extends number> =
  Exclude<Enumerate<T>, Enumerate<F>> | T;

export const intRange = <F extends number, T extends number>(from: F, to: T): IntRange<F, T>[] => {
  return Array.from(
    { length: to - from + 1 },
    (_, i) => (from + i) as IntRange<F, T>
  );
};