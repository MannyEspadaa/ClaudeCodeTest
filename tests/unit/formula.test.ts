import { describe, expect, it } from "vitest";
import { evaluate, FormulaError, formulaVariables, parseFormula } from "@/lib/formula";

describe("formula", () => {
  it("respects precedence, parentheses and unary minus", () => {
    expect(evaluate("(kills + assists) / deaths", { kills: 10, assists: 5, deaths: 3 })).toBe(5);
    expect(evaluate("1 + 2 * 3", {})).toBe(7);
    expect(evaluate("-(2 - 5) * 2", {})).toBe(6);
    expect(evaluate("100 * won / (won + lost)", { won: 3, lost: 1 })).toBe(75);
  });

  it("returns null for division by zero or missing values", () => {
    expect(evaluate("kills / deaths", { kills: 4, deaths: 0 })).toBeNull();
    expect(evaluate("kills / deaths", { kills: 4 })).toBeNull();
  });

  it("lists variables", () => {
    expect(formulaVariables("(kills + assists) / deaths").sort()).toEqual(["assists", "deaths", "kills"]);
  });

  it.each(["kills +", "(kills", "kills ) ", "kills; drop", "2 ** 3", "Kills", "process.exit()"])("rejects %s", (src) => {
    expect(() => parseFormula(src)).toThrow(FormulaError);
  });
});
