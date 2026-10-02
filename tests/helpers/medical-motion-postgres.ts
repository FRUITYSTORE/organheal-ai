import { isolatedPostgresTarget, isolatedPostgresQuery } from "../../lib/medical-motion/worker/postgres-transport";
export class LocalPostgresError extends Error {
  constructor(readonly code?: string) { super("Local context PostgreSQL assertion failed."); }
}
export function configuration() { return isolatedPostgresTarget(process.env); }
export async function sql(input: string, onLocked?: () => void): Promise<string> {
  try { return await isolatedPostgresQuery(process.env, input, onLocked); }
  catch(error) { throw new LocalPostgresError((error as {code?:string}).code); }
}
