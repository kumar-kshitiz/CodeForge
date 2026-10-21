import type { SupportedSyntaxLanguage, SyntaxEntry } from "./syntaxReference";

export type SyntaxContext = { line: string; column: number };

// Deliberately limited to declarations on the active line, not full type inference.
export function findContextualSyntax(
  language: SupportedSyntaxLanguage,
  keyword: string,
  context: SyntaxContext,
): SyntaxEntry | undefined {
  if (language !== "cpp") return;
  const line = context.line.split("//")[0];
  const declarations: { type: string; name: string; start: number; end: number }[] = [];
  const pattern = /\b(?:std::)?(unordered_map|unordered_multimap|map|multimap|unordered_set|unordered_multiset|set|multiset|vector|deque|list|string)\b/g;
  for (const match of line.matchAll(pattern)) {
    let offset = match.index! + match[0].length;
    while (/\s/.test(line[offset] ?? "") && offset < line.length) offset++;
    if (match[1] !== "string") {
      if (line[offset] !== "<") continue;
      let depth = 0;
      do {
        if (line[offset] === "<") depth++;
        if (line[offset] === ">") depth--;
        offset++;
      } while (depth > 0 && offset < line.length);
      if (depth !== 0) continue;
    }
    const variable = /^\s+([A-Za-z_]\w*)\s*(?=[;={]|$)/.exec(line.slice(offset))
      ?? /^([A-Za-z_]\w*)\s*(?=[;={]|$)/.exec(line.slice(offset));
    if (!variable) continue;
    declarations.push({ type: match[1], name: variable[1], start: match.index!, end: offset + variable[0].length });
  }
  // Choose the closest declaration if several appear on a single line.
  const position = context.column - 1;
  const distance = (item: typeof declarations[number]) =>
    position < item.start ? item.start - position : Math.max(0, position - item.end);
  const target = declarations.sort((a, b) => distance(a) - distance(b))[0];
  if (!target) return;
  const { name, type } = target;
  const associative = /map|set/.test(type);
  const mapped = type.includes("map");
  const argument = mapped ? "key" : "value";
  const entry = (syntax: string, note: string): SyntaxEntry => ({
    keyword, syntax, description: `Detected ${type} ${name}. ${note}`,
  });
  if (["empty", "clear", "length", "size"].includes(keyword)) {
    return entry(`${name}.${keyword === "length" ? "size" : keyword}();`, "Use the container's member operation.");
  }
  if (associative && ["contains", "count", "erase"].includes(keyword)) {
    return entry(`${name}.${keyword}(${argument});`, keyword === "erase"
      ? "Erases every matching key, including duplicates in multi-containers."
      : "Search by key; contains is available in C++20.");
  }
  if (associative && keyword === "insert") {
    return entry(`${name}.insert(${mapped ? "{key, value}" : "value"});`, "Insert into this associative container.");
  }
  if (associative && !type.startsWith("unordered") && ["lower bound", "upper bound", "equal range"].includes(keyword)) {
    return entry(`auto result = ${name}.${keyword.replace(/ /g, "_")}(${argument});`, "Use ordered-container lookup.");
  }
  if (keyword === "sort" && ["vector", "deque", "string", "list"].includes(type)) {
    return entry(type === "list" ? `${name}.sort();` : `std::sort(${name}.begin(), ${name}.end());`,
      type === "list" ? "List sorting uses its member function." : "Requires <algorithm>.");
  }
  if (keyword === "reverse" && !associative) {
    return entry(type === "list" ? `${name}.reverse();` : `std::reverse(${name}.begin(), ${name}.end());`,
      type === "list" ? "Reverse the list." : "Requires <algorithm>.");
  }
  if (keyword !== "find") return;
  if (type === "string") return {
    keyword,
    syntax: `auto pos = ${name}.find(text);\nif (pos != std::string::npos) {\n    // Found at index pos.\n}`,
    description: `Search ${name} for a substring. Replace text with the string to find.`,
  };
  if (["vector", "deque", "list"].includes(type)) return {
    keyword,
    syntax: `auto it = std::find(${name}.begin(), ${name}.end(), value);\nif (it != ${name}.end()) {\n    // Found: *it\n}`,
    description: `Search ${name} for a value. Requires <algorithm>; replace value with your search value.`,
  };
  const isMap = type.includes("map");
  return {
    keyword,
    syntax: `auto it = ${name}.find(${isMap ? "key" : "value"});\nif (it != ${name}.end()) {\n    // Found: ${isMap ? "it->second" : "*it"}\n}`,
    description: `Detected ${type} ${name} on your cursor's line. Replace ${isMap ? "key with the key" : "value with the value"} to search for.`,
  };
}
