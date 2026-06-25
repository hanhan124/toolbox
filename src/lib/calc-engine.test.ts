import { describe, it, expect } from "vitest";
import {
  factorial, parseNum, fmt,
  pressNum, pressOp, pressEval, pressFunc, pressConst,
  clear, allClear, backspace, toggleSign, toggleAngle,
  handleMem, simulate, INIT, type CalcState,
} from "./calc-engine";

/* ── helpers ─────────────────────────────────────────── */

describe("factorial", () => {
  it("0! = 1", () => expect(factorial(0)).toBe(1));
  it("1! = 1", () => expect(factorial(1)).toBe(1));
  it("5! = 120", () => expect(factorial(5)).toBe(120));
  it("10! = 3628800", () => expect(factorial(10)).toBe(3628800));
  it("negative → NaN", () => expect(factorial(-1)).toBeNaN());
  it("fraction → NaN", () => expect(factorial(1.5)).toBeNaN());
  it("171 → Infinity", () => expect(factorial(171)).toBe(Infinity));
});

describe("parseNum", () => {
  it("parses plain number", () => expect(parseNum("42")).toBe(42));
  it("parses comma-separated", () => expect(parseNum("1,000")).toBe(1000));
  it("empty → 0", () => expect(parseNum("")).toBe(0));
});

describe("fmt", () => {
  it("formats finite", () => expect(fmt(1234)).toBe("1,234"));
  it("Error for Infinity", () => expect(fmt(Infinity)).toBe("Error"));
  it("Error for NaN", () => expect(fmt(NaN)).toBe("Error"));
});

/* ── number buttons ──────────────────────────────────── */

describe("pressNum", () => {
  it("digit from 0", () => expect(pressNum(INIT, "5").result).toBe("5"));
  it("append digit", () => {
    const s = pressNum(pressNum(INIT, "1"), "2");
    expect(s.result).toBe("12");
  });
  it("decimal point", () => {
    const s = pressNum(pressNum(pressNum(INIT, "3"), "."), "5");
    expect(s.result).toBe("3.5");
  });
  it("no double decimal", () => {
    let s = pressNum(pressNum(INIT, "1"), ".");
    s = pressNum(s, ".");
    expect(s.result).toBe("1.");
  });
  it("from 0 replaces", () => expect(pressNum(INIT, "7").result).toBe("7"));
  it("after error resets", () => {
    const s = pressNum({ ...INIT, error: true }, "3");
    expect(s.result).toBe("3");
    expect(s.error).toBe(false);
    expect(s.expr).toBe("");
  });
});

/* ── operators ───────────────────────────────────────── */

describe("pressOp – +", () => {
  it("sets expr with +", () => {
    const s = pressOp({ ...INIT, result: "5" }, "+");
    expect(s.expr).toBe("5 + ");
  });
  it("chains: 3+2 → 5", () => {
    const s = simulate(["3", "+", "2", "+"]);
    expect(s.result).toBe("5");
  });
});

describe("pressOp – -", () => {
  it("sets expr with -", () => {
    const s = pressOp({ ...INIT, result: "5" }, "-");
    expect(s.expr).toBe("5 - ");
  });
  it("chains: 9-4 → 5", () => {
    const s = simulate(["9", "-", "4", "+"]);
    expect(s.result).toBe("5");
  });
});

describe("pressOp – ×", () => {
  it("sets expr with ×", () => {
    const s = pressOp({ ...INIT, result: "5" }, "×");
    expect(s.expr).toBe("5 × ");
  });
  it("chains: 3×4 → 12", () => {
    const s = simulate(["3", "×", "4", "+"]);
    expect(s.result).toBe("12");
  });
});

describe("pressOp – ÷", () => {
  it("sets expr with ÷", () => {
    const s = pressOp({ ...INIT, result: "5" }, "÷");
    expect(s.expr).toBe("5 ÷ ");
  });
  it("chains: 10÷2 → 5", () => {
    const s = simulate(["1", "0", "÷", "2", "+"]);
    expect(s.result).toBe("5");
  });
  it("÷0 → Error", () => {
    const s = simulate(["1", "÷", "0", "="]);
    expect(s.result).toBe("Error");
  });
});

describe("pressOp – ^", () => {
  it("2^3 = 8", () => {
    const s = simulate(["2", "^", "3", "="]);
    expect(s.result).toBe("8");
  });
});

describe("pressOp – !", () => {
  it("5! = 120", () => {
    const s = simulate(["5", "!"]);
    expect(s.result).toBe("120");
  });
});

/* ── eval / = ────────────────────────────────────────── */

describe("pressEval", () => {
  it("evaluates 3+4 = 7", () => {
    const s = simulate(["3", "+", "4", "="]);
    expect(s.result).toBe("7");
  });
  it("evaluates 10-3 = 7", () => {
    const s = simulate(["1", "0", "-", "3", "="]);
    expect(s.result).toBe("7");
  });
  it("evaluates 6×7 = 42", () => {
    const s = simulate(["6", "×", "7", "="]);
    expect(s.result).toBe("42");
  });
  it("evaluates 8÷2 = 4", () => {
    const s = simulate(["8", "÷", "2", "="]);
    expect(s.result).toBe("4");
  });
  it("evaluates 2^10 = 1,024", () => {
    const s = simulate(["2", "^", "1", "0", "="]);
    expect(s.result).toBe("1,024");
  });
  it("no-op without two operands", () => {
    const s = pressEval(INIT);
    expect(s).toEqual(INIT);
  });
  it("eval on error → no-op", () => {
    const s = pressEval({ ...INIT, error: true });
    expect(s.error).toBe(true);
  });
});

/* ── scientific functions ─────────────────────────────── */

describe("pressFunc – sin/cos/tan", () => {
  it("sin(0) = 0", () => {
    const s = simulate(["0", "fn:sin"]);
    expect(parseNum(s.result)).toBeCloseTo(0);
  });
  it("cos(0) = 1", () => {
    const s = simulate(["0", "fn:cos"]);
    expect(parseNum(s.result)).toBeCloseTo(1);
  });
  it("tan(0) = 0", () => {
    const s = simulate(["0", "fn:tan"]);
    expect(parseNum(s.result)).toBeCloseTo(0);
  });
  it("sin(90°) ≈ 1 in DEG", () => {
    let s = { ...INIT, result: "90" };
    s = pressFunc(s, "sin");
    expect(parseNum(s.result)).toBeCloseTo(1);
  });
  it("sin(π/2) ≈ 1 in RAD", () => {
    let s: CalcState = { ...INIT, result: fmt(Math.PI / 2), angle: "RAD" };
    s = pressFunc(s, "sin");
    expect(parseNum(s.result)).toBeCloseTo(1);
  });
});

describe("pressFunc – inverse trig", () => {
  it("asin(1) = 90° in DEG", () => {
    const s = pressFunc({ ...INIT, result: "1" }, "asin");
    expect(parseNum(s.result)).toBeCloseTo(90);
  });
  it("acos(1) = 0°", () => {
    const s = pressFunc({ ...INIT, result: "1" }, "acos");
    expect(parseNum(s.result)).toBeCloseTo(0);
  });
  it("atan(1) = 45°", () => {
    const s = pressFunc({ ...INIT, result: "1" }, "atan");
    expect(parseNum(s.result)).toBeCloseTo(45);
  });
});

describe("pressFunc – log/ln", () => {
  it("ln(1) = 0", () => {
    const s = simulate(["1", "fn:ln"]);
    expect(parseNum(s.result)).toBeCloseTo(0);
  });
  it("log(100) = 2", () => {
    const s = simulate(["1", "0", "0", "fn:log"]);
    expect(parseNum(s.result)).toBeCloseTo(2);
  });
  it("ln(0) → Error", () => {
    const s = pressFunc({ ...INIT, result: "0" }, "ln");
    expect(s.error).toBe(true);
  });
  it("log(0) → Error", () => {
    const s = pressFunc({ ...INIT, result: "0" }, "log");
    expect(s.error).toBe(true);
  });
});

describe("pressFunc – sqrt/cbrt", () => {
  it("sqrt(9) = 3", () => {
    const s = simulate(["9", "fn:sqrt"]);
    expect(parseNum(s.result)).toBeCloseTo(3);
  });
  it("sqrt(-1) → Error", () => {
    const s = pressFunc({ ...INIT, result: "-1" }, "sqrt");
    expect(s.error).toBe(true);
  });
  it("cbrt(8) = 2", () => {
    const s = simulate(["8", "fn:cbrt"]);
    expect(parseNum(s.result)).toBeCloseTo(2);
  });
});

describe("pressFunc – sq/cube/inv/abs/exp/sign", () => {
  it("sq(5) = 25", () => {
    const s = simulate(["5", "fn:sq"]);
    expect(parseNum(s.result)).toBeCloseTo(25);
  });
  it("cube(3) = 27", () => {
    const s = simulate(["3", "fn:cube"]);
    expect(parseNum(s.result)).toBeCloseTo(27);
  });
  it("inv(4) = 0.25", () => {
    const s = simulate(["4", "fn:inv"]);
    expect(parseNum(s.result)).toBeCloseTo(0.25);
  });
  it("inv(0) → Error", () => {
    const s = pressFunc({ ...INIT, result: "0" }, "inv");
    expect(s.error).toBe(true);
  });
  it("abs(-7) = 7", () => {
    const s = pressFunc({ ...INIT, result: "-7" }, "abs");
    expect(parseNum(s.result)).toBeCloseTo(7);
  });
  it("exp(0) = 1", () => {
    const s = simulate(["0", "fn:exp"]);
    expect(parseNum(s.result)).toBeCloseTo(1);
  });
  it("sign(-5) = -1", () => {
    const s = pressFunc({ ...INIT, result: "-5" }, "sign");
    expect(parseNum(s.result)).toBe(-1);
  });
  it("sign(0) = 0", () => {
    const s = pressFunc(INIT, "sign");
    expect(parseNum(s.result)).toBe(0);
  });
});

/* ── constants ───────────────────────────────────────── */

describe("pressConst", () => {
  it("π ≈ 3.14159", () => {
    const s = pressConst(INIT, "pi");
    expect(parseNum(s.result)).toBeCloseTo(Math.PI);
  });
  it("e ≈ 2.71828", () => {
    const s = pressConst(INIT, "e");
    expect(parseNum(s.result)).toBeCloseTo(Math.E);
  });
  it("after error resets", () => {
    const s = pressConst({ ...INIT, error: true }, "pi");
    expect(s.error).toBe(false);
    expect(parseNum(s.result)).toBeCloseTo(Math.PI);
  });
});

/* ── clear / AC / backspace / ± ──────────────────────── */

describe("clear (C)", () => {
  it("resets result to 0", () => {
    const s = clear({ ...INIT, result: "42", expr: "5 + " });
    expect(s.result).toBe("0");
    expect(s.expr).toBe("");
    expect(s.error).toBe(false);
  });
});

describe("allClear (AC)", () => {
  it("resets everything including memory", () => {
    const s = allClear({ ...INIT, result: "99", mem: { value: 5, hasValue: true } });
    expect(s.result).toBe("0");
    expect(s.expr).toBe("");
    expect(s.mem.hasValue).toBe(false);
  });
});

describe("backspace", () => {
  it("removes last char", () => {
    const s = backspace({ ...INIT, result: "123" });
    expect(s.result).toBe("12");
  });
  it("last char → 0", () => {
    const s = backspace({ ...INIT, result: "5" });
    expect(s.result).toBe("0");
  });
  it("on error → 0, clears error", () => {
    const s = backspace({ ...INIT, result: "42", error: true });
    expect(s.result).toBe("0");
    expect(s.error).toBe(false);
  });
});

describe("toggleSign (±)", () => {
  it("positive → negative", () => {
    const s = toggleSign({ ...INIT, result: "5" });
    expect(s.result).toBe("-5");
  });
  it("negative → positive", () => {
    const s = toggleSign({ ...INIT, result: "-5" });
    expect(s.result).toBe("5");
  });
  it("0 stays 0", () => {
    const s = toggleSign(INIT);
    expect(s.result).toBe("0");
  });
  it("on error → no-op", () => {
    const s = toggleSign({ ...INIT, result: "5", error: true });
    expect(s.result).toBe("5");
  });
});

/* ── angle toggle ────────────────────────────────────── */

describe("toggleAngle", () => {
  it("DEG → RAD", () => expect(toggleAngle(INIT).angle).toBe("RAD"));
  it("RAD → DEG", () => expect(toggleAngle({ ...INIT, angle: "RAD" }).angle).toBe("DEG"));
});

/* ── memory ──────────────────────────────────────────── */

describe("handleMem", () => {
  it("M+ stores value", () => {
    const s = handleMem({ ...INIT, result: "10" }, "M+");
    expect(s.mem.value).toBe(10);
    expect(s.mem.hasValue).toBe(true);
  });
  it("M+ accumulates", () => {
    let s = handleMem({ ...INIT, result: "10" }, "M+");
    s = handleMem({ ...s, result: "5" }, "M+");
    expect(s.mem.value).toBe(15);
  });
  it("M- subtracts", () => {
    let s = handleMem({ ...INIT, result: "10" }, "M+");
    s = handleMem({ ...s, result: "3" }, "M-");
    expect(s.mem.value).toBe(7);
  });
  it("MR recalls memory", () => {
    const s = handleMem({ ...INIT, mem: { value: 42, hasValue: true } }, "MR");
    expect(s.result).toBe("42");
    expect(s.expr).toBe("");
  });
  it("MC clears memory", () => {
    const s = handleMem({ ...INIT, mem: { value: 99, hasValue: true } }, "MC");
    expect(s.mem.value).toBe(0);
    expect(s.mem.hasValue).toBe(false);
  });
});

/* ── simulate multi-step scenarios ───────────────────── */

describe("simulate – full scenarios", () => {
  it("3 + 4 = 7", () => {
    const s = simulate(["3", "+", "4", "="]);
    expect(s.result).toBe("7");
  });
  it("10 × 5 = 50", () => {
    const s = simulate(["1", "0", "×", "5", "="]);
    expect(s.result).toBe("50");
  });
  it("100 ÷ 4 = 25", () => {
    const s = simulate(["1", "0", "0", "÷", "4", "="]);
    expect(s.result).toBe("25");
  });
  it("99 − 37 = 62", () => {
    const s = simulate(["9", "9", "-", "3", "7", "="]);
    expect(s.result).toBe("62");
  });
  it("2^8 = 256", () => {
    const s = simulate(["2", "^", "8", "="]);
    expect(s.result).toBe("256");
  });
  it("5! = 120", () => {
    const s = simulate(["5", "!"]);
    expect(s.result).toBe("120");
  });
  it("AC clears memory too", () => {
    let s = handleMem({ ...INIT, result: "10" }, "M+");
    s = simulate(["AC"]);
    expect(s.mem.hasValue).toBe(false);
    expect(s.result).toBe("0");
  });
  it("backspace on multi-digit", () => {
    const s = simulate(["1", "2", "3", "BS"]);
    expect(s.result).toBe("12");
  });
  it("toggle sign then back", () => {
    const s = simulate(["5", "±"]);
    expect(s.result).toBe("-5");
  });
  it("memory round-trip (no AC)", () => {
    const s = simulate(["3", "7", "mem:M+", "mem:MR"]);
    expect(s.result).toBe("37");
  });
  it("AC clears memory so MR returns 0", () => {
    const s = simulate(["3", "7", "mem:M+", "AC", "mem:MR"]);
    expect(s.result).toBe("0");
  });
});
