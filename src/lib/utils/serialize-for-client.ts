type JsonPrimitive = string | number | boolean | null;
type NonJsonable = undefined | symbol | ((...args: unknown[]) => unknown);

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Jsonify<T> = T extends JsonPrimitive
  ? T
  : T extends Date
    ? string
    : T extends { toJSON(): infer U }
      ? Jsonify<U>
      : T extends readonly (infer U)[]
        ? Jsonify<U>[]
        : T extends object
          ? {
              [K in keyof T as T[K] extends NonJsonable ? never : K]: Jsonify<
                T[K]
              >;
            }
          : never;

export default function serializeForClient<T>(value: T): Jsonify<T> {
  return JSON.parse(JSON.stringify(value)) as Jsonify<T>;
}
