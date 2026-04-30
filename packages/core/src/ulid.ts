import { monotonicFactory } from "ulidx";

const monotonicUlid = monotonicFactory();

export function newId(): string {
  return monotonicUlid();
}
