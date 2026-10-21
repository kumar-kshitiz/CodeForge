import type { SyntaxEntry } from "./syntaxReference";

const heap = `class BinaryHeap {
  constructor(before = (a, b) => a < b) {
    this.data = [];
    this.before = before;
  }
  get size() { return this.data.length; }
  peek() { return this.data[0]; }
  push(value) {
    const a = this.data;
    a.push(value);
    let i = a.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (!this.before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.data;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1, right = left + 1;
        let best = i;
        if (left < a.length && this.before(a[left], a[best])) best = left;
        if (right < a.length && this.before(a[right], a[best])) best = right;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return top;
  }
}`;

const entries: [string, string, string][] = [
  ["let", "let value = 0;", "Block-scoped mutable binding."],
  ["const", "const arr = [];\narr.push(1);", "Binding cannot be reassigned; its array or object can still be mutated."],
  ["undefined", "const missing = undefined;\nconst empty = null;", "undefined usually means absent; null is an explicit empty value."],
  ["typeof", "const kind = typeof value;\nconst isArray = Array.isArray(value);", "typeof null is object; use Array.isArray for arrays."],
  ["equality", "const equal = a === b;\nconst different = a !== b;", "Strict comparisons avoid implicit type conversion; objects compare by identity."],
  ["ternary", "const result = condition ? first : second;", "Conditional expression."],
  ["nullish coalescing", "const result = value ?? fallback;", "Use fallback only for null or undefined; preserve zero and false."],
  ["optional chaining", "const value = object?.nested?.value;", "Safely read through null or undefined references; object must be declared."],
  ["destructuring", "const [first, second] = arr;\nconst { name, score } = item;", "Unpack array elements and object properties."],
  ["swap", "[a, b] = [b, a];", "Swap two mutable bindings."],
  ["spread", "const copy = [...arr];\nconst merged = [...first, ...second];", "Shallow array copy or concatenation."],
  ["rest", "function sum(...values) {\n  return values.reduce((total, x) => total + x, 0);\n}", "Collect remaining arguments into an array."],
  ["template literal", "const message = `Result: ${value}`;", "Interpolate expressions into a string."],
  ["conversion", "const number = Number(text);\nconst textValue = String(value);\nconst boolean = Boolean(value);", "Number of invalid numeric text is NaN; Boolean of a nonempty string is true."],
  ["parseint", "const value = parseInt(text, 10);", "Parse a decimal integer prefix; trailing text may be ignored."],
  ["nan", "const invalid = Number.isNaN(value);", "Check NaN without coercion."],
  ["safe integer", "const safe = Number.isSafeInteger(value);\nconst limit = Number.MAX_SAFE_INTEGER;", "Number integers are exact only within ±(2^53 - 1)."],
  ["bigint", "const a = BigInt(text);\nconst total = a + 1n;\nconsole.log(total.toString());", "Arbitrary precision integers; do not mix BigInt and Number arithmetic."],
  ["integer division", "const quotient = Math.trunc(a / b);", "Truncate toward zero; b must be nonzero. BigInt division also truncates toward zero."],
  ["modulo", "const remainder = ((value % modulus) + modulus) % modulus;", "Normalize negative remainders for a positive modulus."],
  ["do while", "do {\n  // ...\n} while (condition);", "Execute at least once."],
  ["break", "break;", "Use inside a loop or switch to exit it."],
  ["continue", "continue;", "Use inside a loop to skip to the next iteration."],
  ["for in", "for (const key in object) {\n  if (Object.prototype.hasOwnProperty.call(object, key)) {\n    // Use object[key].\n  }\n}", "Iterate enumerable keys; guard against inherited properties."],
  ["foreach", "arr.forEach((value, index) => {\n  // ...\n});", "Visit array elements; break and awaited sequencing do not work as with a normal loop."],
  ["entries", "for (const [index, value] of arr.entries()) {\n  // ...\n}", "Iterate array indices and values."],
  ["array from", "const arr = Array.from({ length: n }, (_, i) => i);", "Build values from indices; unlike Array(n), entries are populated."],
  ["fill", "const arr = Array(n).fill(0);", "Fill an array; filling with an object shares that same object across slots."],
  ["copy", "const copy = arr.slice();", "Shallow copy; nested objects remain shared."],
  ["concat", "const merged = first.concat(second);", "Return a new concatenated array."],
  ["splice", "arr.splice(index, deleteCount, value);", "Mutate by deleting and inserting elements; returns removed elements."],
  ["unshift", "arr.unshift(value);", "Prepend; requires shifting array elements."],
  ["indexof", "const index = arr.indexOf(value);", "First matching index, or -1 if absent; does not find NaN."],
  ["includes", "const found = arr.includes(value);", "Membership check; also works on strings."],
  ["find", "const item = arr.find((value) => value > target);", "First predicate match, or undefined."],
  ["findindex", "const index = arr.findIndex((value) => value > target);", "First predicate-match index, or -1."],
  ["some", "const found = arr.some((value) => value > 0);", "True if at least one element matches."],
  ["every", "const valid = arr.every((value) => value > 0);", "True if every element matches; true for an empty array."],
  ["flat", "const values = matrix.flat();", "Flatten one level; supply a depth to flatten more."],
  ["flatmap", "const values = arr.flatMap((value) => [value, value]);", "Map then flatten one level."],
  ["sort", "arr.sort((a, b) => a - b);", "Numeric ascending sort in place. Default sort compares strings."],
  ["sort descending", "arr.sort((a, b) => b - a);", "Numeric descending sort."],
  ["comparator", "const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;\narr.sort(compare);", "Return negative/zero/positive, not a Boolean. This also works for BigInt values."],
  ["custom sort", "arr.sort((a, b) => a[1] - b[1] || a[0] - b[0]);", "Numeric pairs: second field ascending, then first."],
  ["sort pairs", "arr.sort((a, b) => b[0] - a[0] || a[1] - b[1]);", "First numeric field descending, second ascending."],
  ["sort objects", "items.sort((a, b) => b.score - a.score || a.id - b.id);", "Score descending; numeric id breaks ties."],
  ["sort strings by length", "words.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));", "Length ascending, then UTF-16 lexicographic order."],
  ["sorted copy", "const sorted = [...arr].sort((a, b) => a - b);", "Keep the original array unchanged."],
  ["sort map by value", "const entries = [...counts.entries()].sort((a, b) => a[1] - b[1]);", "Sort Map entries by numeric value into a new array."],
  ["object", "const item = { name: 'Ada', score: 0 };\nitem.score += 1;", "Object property access and mutation."],
  ["object keys", "const keys = Object.keys(object);", "Own enumerable string keys."],
  ["object values", "const values = Object.values(object);", "Own enumerable property values."],
  ["object entries", "for (const [key, value] of Object.entries(object)) {\n  // ...\n}", "Iterate own key-value pairs."],
  ["from entries", "const object = Object.fromEntries(entries);", "Convert key-value pairs to an object."],
  ["map get", "const value = counts.get(key) ?? 0;", "Read a Map value with a nullish default."],
  ["map set", "counts.set(key, value);", "Insert or replace a Map value."],
  ["map has", "const exists = counts.has(key);", "Check a Map key without inserting it."],
  ["map delete", "const removed = counts.delete(key);", "Delete a Map entry; returns whether it existed."],
  ["map iteration", "for (const [key, value] of counts) {\n  // ...\n}", "Map iterates in insertion order."],
  ["frequency", "const counts = new Map();\nfor (const value of arr) {\n  counts.set(value, (counts.get(value) ?? 0) + 1);\n}", "Count values with a Map."],
  ["size", "const count = values.size;", "Map/Set use .size; arrays and strings use .length."],
  ["clear", "values.clear();", "Empty a Map or Set; arrays can use arr.length = 0."],
  ["unique", "const unique = [...new Set(arr)];", "Remove duplicates, preserving first occurrence order."],
  ["set has", "const exists = seen.has(value);", "Check Set membership."],
  ["set delete", "seen.delete(value);", "Remove a Set value if present."],
  ["set union", "const union = new Set([...a, ...b]);", "Portable union of two sets."],
  ["set intersection", "const intersection = new Set([...a].filter((value) => b.has(value)));", "Portable intersection."],
  ["set difference", "const difference = new Set([...a].filter((value) => !b.has(value)));", "Values in a but not b."],
  ["queue", "const queue = [];\nlet head = 0;\nqueue.push(start);\nwhile (head < queue.length) {\n  const value = queue[head++];\n  // Enqueue neighbors with queue.push(next).\n}", "Avoid repeated shift() for BFS; retains processed entries until the array is released."],
  ["heap", heap, "Reusable binary heap. before(a,b) must be true when a has higher priority. push/pop O(log n); peek O(1)."],
  ["min heap", heap + "\n\nconst heap = new BinaryHeap();\nheap.push(value);\nconst smallest = heap.pop();", "Standalone numeric min-heap; empty pop returns undefined."],
  ["max heap", heap + "\n\nconst heap = new BinaryHeap((a, b) => a > b);\nheap.push(value);\nconst largest = heap.pop();", "Standalone numeric max-heap."],
  ["custom heap", heap + "\n\nconst heap = new BinaryHeap((a, b) =>\n  a.priority !== b.priority ? a.priority < b.priority : a.id < b.id\n);\nheap.push({ priority: 2, id: 10 });", "Lower priority number first; lower numeric id breaks ties. Uses a Boolean heap comparator, unlike Array.sort."],
  ["pair min heap", heap + "\n\nconst heap = new BinaryHeap((a, b) =>\n  a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1]\n);\nheap.push([distance, node]);", "Smaller distance first; numeric node id breaks ties."],
  ["lower bound", "function lowerBound(arr, target) {\n  let left = 0, right = arr.length;\n  while (left < right) {\n    const mid = left + Math.floor((right - left) / 2);\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid;\n  }\n  return left;\n}", "Sorted input: first index with value >= target, or length."],
  ["upper bound", "function upperBound(arr, target) {\n  let left = 0, right = arr.length;\n  while (left < right) {\n    const mid = left + Math.floor((right - left) / 2);\n    if (arr[mid] <= target) left = mid + 1;\n    else right = mid;\n  }\n  return left;\n}", "Sorted input: first index with value > target, or length."],
  ["binary search", "function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = left + Math.floor((right - left) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}", "Ascending sorted array: return a matching index or -1."],
  ["prefix sum", "const prefix = [0];\nfor (const value of arr) prefix.push(prefix[prefix.length - 1] + value);\nconst rangeSum = prefix[right] - prefix[left];", "Sum over [left,right); use safe Number totals or a BigInt variant."],
  ["trim", "const clean = text.trim();", "Remove surrounding whitespace."],
  ["substring", "const part = text.slice(start, end);", "Half-open string range; indices count UTF-16 code units."],
  ["replace", "const changed = text.replace(pattern, replacement);", "String pattern replaces the first occurrence; global regex replaces all matches."],
  ["replace all", "const changed = text.replaceAll(oldText, newText);", "Replace every occurrence of a string pattern."],
  ["starts with", "const matches = text.startsWith(prefix);", "Check a prefix."],
  ["ends with", "const matches = text.endsWith(suffix);", "Check a suffix."],
  ["lowercase", "const lower = text.toLowerCase();", "Return lowercase text."],
  ["uppercase", "const upper = text.toUpperCase();", "Return uppercase text."],
  ["char code", "const code = text.charCodeAt(index);\nconst letter = String.fromCharCode(code);", "Read/write a UTF-16 code unit."],
  ["code point", "const code = text.codePointAt(0);\nconst letter = String.fromCodePoint(code);", "Full Unicode code point; fromCodePoint needs a valid code."],
  ["reverse string", "const reversed = [...text].reverse().join('');", "Reverse Unicode code points; combined grapheme clusters may still split."],
  ["regex", "const digitsOnly = /^\\d+$/.test(text);\nconst matches = text.match(/\\d+/g) ?? [];", "Test digits or extract digit sequences."],
  ["sum", "const total = arr.reduce((sum, value) => sum + value, 0);", "Sum with an initial zero, including empty arrays."],
  ["min", "const minimum = arr.reduce((best, value) => Math.min(best, value), Infinity);", "Avoid spreading huge arrays into function arguments; empty result is Infinity."],
  ["max", "const maximum = arr.reduce((best, value) => Math.max(best, value), -Infinity);", "Avoid argument-count limits on huge arrays; empty result is -Infinity."],
  ["abs", "const magnitude = Math.abs(value);", "Absolute Number value; Math methods do not accept BigInt."],
  ["floor", "const rounded = Math.floor(value);", "Round toward negative infinity."],
  ["ceil", "const rounded = Math.ceil(value);", "Round toward positive infinity."],
  ["round", "const rounded = Math.round(value);", "Nearest integer; ties go toward positive infinity."],
  ["gcd", "function gcd(a, b) {\n  a = Math.abs(a); b = Math.abs(b);\n  while (b !== 0) [a, b] = [b, a % b];\n  return a;\n}", "Euclidean algorithm for safe integer Number inputs."],
  ["modular power", "function modPow(base, exponent, modulus) {\n  if (exponent < 0n || modulus <= 0n) throw new RangeError();\n  base = ((base % modulus) + modulus) % modulus;\n  let result = 1n % modulus;\n  while (exponent > 0n) {\n    if (exponent & 1n) result = result * base % modulus;\n    base = base * base % modulus;\n    exponent >>= 1n;\n  }\n  return result;\n}", "Exact modular exponentiation; all arguments must be BigInt."],
  ["bit operators", "const both = a & b;\nconst either = a | b;\nconst different = a ^ b;\nconst inverted = ~a;", "Number bitwise operations coerce to 32-bit integers; BigInt operations preserve precision."],
  ["bit shift", "const mask = 1n << BigInt(bit);", "BigInt mask for a nonnegative bit index; Number shift counts wrap modulo 32."],
  ["unsigned shift", "const unsigned = value >>> 0;", "Convert a Number to unsigned 32-bit; >>> is not available for BigInt."],
  ["memoization", "const memo = new Map();\nfunction fib(n) {\n  if (n < 2) return n;\n  if (memo.has(n)) return memo.get(n);\n  const value = fib(n - 1) + fib(n - 2);\n  memo.set(n, value);\n  return value;\n}", "Cache repeated subproblems; recursion depth and Number precision still apply."],
  ["default arguments", "function solve(value, limit = 10) {\n  return Math.min(value, limit);\n}", "Default applies for missing or undefined arguments."],
  ["closure", "function makeCounter() {\n  let value = 0;\n  return () => ++value;\n}", "Retain access to an enclosing scope."],
  ["generator", "function* squares(n) {\n  for (let i = 0; i < n; i++) yield i * i;\n}", "Yield values lazily."],
  ["inheritance", "class Base {\n  get() { return 1; }\n}\nclass Derived extends Base {\n  get() { return super.get() + 1; }\n}", "Extend a class and override a method."],
  ["getter", "class Counter {\n  constructor() { this.value = 0; }\n  get count() { return this.value; }\n}", "Computed property getter."],
  ["exception", "try {\n  throw new Error('Invalid input');\n} catch (error) {\n  console.error(error.message);\n} finally {\n  // Cleanup.\n}", "Throw, catch, and clean up."],
  ["json", "const object = JSON.parse(text);\nconst encoded = JSON.stringify(object);", "JSON serialization; BigInt and circular references are unsupported by default."],
  ["promise", "const result = await Promise.resolve(value);", "Use inside an async function; promises represent future results."],
  ["async await", "async function solve() {\n  const value = await getValue();\n  return value;\n}", "Wait for a promise; does not make CPU work multithreaded."],
  ["promise all", "const results = await Promise.all(tasks);", "Use inside an async function. Rejects when any input promise rejects."],
];

export const javascriptSyntax: SyntaxEntry[] = entries.map(([keyword, syntax, description]) => ({ keyword, syntax, description }));

export function normalizeJavascriptKeyword(query: string): string {
  const key = query.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    'minheap': 'min heap', 'maxheap': 'max heap', 'priority queue': 'custom heap',
    'sort comparator': 'comparator', 'sort key': 'custom sort', 'array.sort': 'sort',
    'array.from': 'array from', 'array.isarray': 'typeof', 'foreach': 'foreach',
    'find index': 'findindex', 'index of': 'indexof', 'flat map': 'flatmap',
    'map.get': 'map get', 'map.set': 'map set', 'map.has': 'map has', 'map.delete': 'map delete',
    'set.has': 'set has', 'set.delete': 'set delete', 'map': 'map',
    'new map': 'hash map', 'dictionary': 'hash map',
    'object.keys': 'object keys', 'object.values': 'object values', 'object.entries': 'object entries',
    'object.fromentries': 'from entries', 'startswith': 'starts with', 'endswith': 'ends with',
    'tolowercase': 'lowercase', 'touppercase': 'uppercase', 'charcodeat': 'char code',
    'codepointat': 'code point', 'replaceall': 'replace all', 'math.min': 'min', 'math.max': 'max',
    'math.floor': 'floor', 'math.ceil': 'ceil', 'math.abs': 'abs', 'math.sqrt': 'sqrt',
    'promise.all': 'promise all', 'parse int': 'parseint', 'big int': 'bigint',
  };
  return aliases[key] ?? key;
}
