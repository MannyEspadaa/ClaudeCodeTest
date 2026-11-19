// Safe arithmetic for derived stats (FREQ43): numbers, stat keys, + - * /, parentheses, unary minus.
// No eval. Division by zero or a missing input yields null ("not available").

type Node =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "neg"; e: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/"; l: Node; r: Node };

export class FormulaError extends Error {}

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|([a-z][a-z0-9_]*)|([-+*/()]))/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new FormulaError(`Unexpected character at position ${pos + 1}.`);
    out.push(m[1] ?? m[2] ?? m[3]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

export function parseFormula(src: string): Node {
  if (src.length > 200) throw new FormulaError("Formula is too long.");
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function primary(): Node {
    const tok = next();
    if (tok === undefined) throw new FormulaError("Formula ended unexpectedly.");
    if (tok === "(") {
      const e = expr();
      if (next() !== ")") throw new FormulaError("Missing closing parenthesis.");
      return e;
    }
    if (tok === "-") return { t: "neg", e: primary() };
    if (/^\d/.test(tok)) return { t: "num", v: Number(tok) };
    if (/^[a-z]/.test(tok)) return { t: "var", name: tok };
    throw new FormulaError(`Unexpected “${tok}”.`);
  }
  function term(): Node {
    let l = primary();
    while (peek() === "*" || peek() === "/") l = { t: "bin", op: next() as "*" | "/", l, r: primary() };
    return l;
  }
  function expr(): Node {
    let l = term();
    while (peek() === "+" || peek() === "-") l = { t: "bin", op: next() as "+" | "-", l, r: term() };
    return l;
  }

  const tree = expr();
  if (i < tokens.length) throw new FormulaError(`Unexpected “${tokens[i]}”.`);
  return tree;
}

export function formulaVariables(src: string): string[] {
  const names = new Set<string>();
  const walk = (n: Node) => {
    if (n.t === "var") names.add(n.name);
    else if (n.t === "neg") walk(n.e);
    else if (n.t === "bin") {
      walk(n.l);
      walk(n.r);
    }
  };
  walk(parseFormula(src));
  return [...names];
}

export function evaluate(src: string | Node, vars: Record<string, number | null | undefined>): number | null {
  const n = typeof src === "string" ? parseFormula(src) : src;
  switch (n.t) {
    case "num":
      return n.v;
    case "var": {
      const v = vars[n.name];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    case "neg": {
      const v = evaluate(n.e, vars);
      return v === null ? null : -v;
    }
    case "bin": {
      const l = evaluate(n.l, vars);
      const r = evaluate(n.r, vars);
      if (l === null || r === null) return null;
      if (n.op === "/") return r === 0 ? null : l / r;
      return n.op === "+" ? l + r : n.op === "-" ? l - r : l * r;
    }
  }
}
