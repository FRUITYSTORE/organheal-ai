import type { MedicalMotionJson } from "@/lib/medical-motion/contracts/execution";
/** Technical decoded-input limits, not clinical/product message limits.
 * UTF-16 units include keys and values. Pre-parse byte enforcement is deferred.
 * Generous text budgets permit normal bilingual clinical input while bounding
 * repeated normalization/validation/hashing work inside one execution. */
export const EXECUTION_INPUT_LIMITS = Object.freeze({
  depth: 64, nodes: 10000, width: 1024,
  stringLength: 65536, keyLength: 1024, totalStringLength: 262144,
});

// Small defensive JSON snapshot: never invoke getters, toJSON or prototype methods.
// Limits apply to the entire decoded request, before clinical/plan execution.
export function jsonSnapshot(value: unknown,
  limits: { readonly [K in keyof typeof EXECUTION_INPUT_LIMITS]: number } = EXECUTION_INPUT_LIMITS,
): MedicalMotionJson {
  const ancestors = new Set<object>();
  let nodes = 0;
  let stringUnits = 0;
  function textBudget(text: string, key = false) {
    stringUnits += text.length;
    if (text.length > (key ? limits.keyLength : limits.stringLength) ||
      stringUnits > limits.totalStringLength) throw new Error("Text budget");
  }
  function visit(current: unknown, depth: number): MedicalMotionJson {
    if (++nodes > limits.nodes || depth > limits.depth) throw new Error("JSON bounds");
    if (typeof current === "string") { textBudget(current); return current; }
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "number" && Number.isFinite(current)) return current;
    if (typeof current !== "object" || current === null || ancestors.has(current)) throw new Error("Non JSON data");
    const array = Array.isArray(current);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(current))) throw new Error("Prototype");
    if (array && Object.getPrototypeOf(current) !== Array.prototype) throw new Error("Array prototype");
    const length = array ? Object.getOwnPropertyDescriptor(current, "length")!.value as number : 0;
    if (array && length > limits.width) throw new Error("Array width");
    // Stop ordinary decoded wide objects before descriptor maps/key copies.
    // JS engines may allocate enumeration state; already-decoded input is not
    // a streaming parser. Reflect.ownKeys remains necessary to reject hidden
    // and symbol properties on runtime objects after enumerable preflight.
    const keys: string[] = [];
    for (const key in current) {
      if (!Object.hasOwn(current, key)) continue;
      if (keys.length >= limits.width) throw new Error("Object width");
      textBudget(key, true); keys.push(key);
    }
    const ownKeys = Reflect.ownKeys(current);
    if (ownKeys.length !== keys.length + (array ? 1 : 0) || ownKeys.some((key) => typeof key !== "string")) throw new Error("Hidden property");
    if (array && (keys.length !== length || keys.some((key, i) => key !== String(i)))) throw new Error("Sparse/extended array");
    ancestors.add(current);
    const result: MedicalMotionJson[] | { [key: string]: MedicalMotionJson } = array ? [] : {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)!;
      if (!("value" in descriptor) || !descriptor.enumerable) throw new Error("Descriptor");
      const child = visit(descriptor.value, depth + 1);
      // Define own data properties; __proto__ must never invoke a setter.
      Object.defineProperty(result, key, { value: child, enumerable: true, writable: true, configurable: true });
    }
    ancestors.delete(current);
    return result;
  }
  return visit(value, 0);
}
