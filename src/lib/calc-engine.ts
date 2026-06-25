export const PI = Math.PI;
export const E = Math.E;

export type Op = "+" | "-" | "×" | "÷" | "^" | "!";

export interface CalcState {
  expr: string;
  result: string;
  angle: "DEG" | "RAD";
  mem: { value: number; hasValue: boolean };
  error: boolean;
}

export const INIT: CalcState = {
  expr: "",
  result: "0",
  angle: "DEG",
  mem: { value: 0, hasValue: false },
  error: false,
};

/* ── helpers ─────────────────────────────────────────── */

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  const s = n.toPrecision(12);
  return parseFloat(s).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

/* ── reducers ────────────────────────────────────────── */

export function pressNum(st: CalcState, digit: string): CalcState {
  if (st.error) return { ...st, result: digit, error: false, expr: "" };
  if (st.expr && st.expr.endsWith(" ")) {
    const newResult = digit === "." ? "0." : digit;
    return { ...st, expr: st.expr + digit, result: newResult };
  }
  if (st.expr) {
    let newResult = st.result;
    if (st.result === "0" && digit !== ".") newResult = digit;
    else if (digit === "." && st.result.includes(".")) newResult = st.result;
    else newResult = st.result + digit;
    return { ...st, expr: st.expr + digit, result: newResult };
  }
  let newResult = st.result;
  if (st.result === "0" && digit !== ".") newResult = digit;
  else if (digit === "." && st.result.includes(".")) newResult = st.result;
  else newResult = st.result + digit;
  return { ...st, result: newResult };
}

export function pressOp(st: CalcState, op: Op): CalcState {
  if (st.error) return st;
  if (op === "!") {
    const v = parseNum(st.result);
    const r = factorial(Math.round(v));
    return { ...st, result: fmt(r), error: !Number.isFinite(r), expr: "" };
  }
  if (st.expr && !st.expr.endsWith(" ")) {
    return runBinary(st, op);
  }
  if (st.expr === "" && st.result !== "0") {
    return { ...st, expr: `${st.result} ${op} ` };
  }
  return st;
}

function runBinary(st: CalcState, op: Op): CalcState {
  const a = evaluate(st);
  const r = fmt(a);
  return { ...st, expr: `${r} ${op} `, result: r, error: !Number.isFinite(a) };
}

function evaluate(st: CalcState): number {
  let fullExpr = st.expr.trimEnd();
  if (fullExpr.endsWith(" ")) {
    fullExpr += st.result;
  }
  const parts = fullExpr.split(" ");
  if (parts.length < 2) return parseNum(st.result);
  let a = parseNum(parts[0]);
  for (let i = 1; i < parts.length - 1; i += 2) {
    const op = parts[i] as Op;
    const b = parseNum(parts[i + 1]);
    switch (op) {
      case "+": a = a + b; break;
      case "-": a = a - b; break;
      case "×": a = a * b; break;
      case "÷": a = b === 0 ? NaN : a / b; break;
      case "^": a = Math.pow(a, b); break;
      default: break;
    }
  }
  return a;
}

export function pressEval(st: CalcState): CalcState {
  if (st.error) return st;
  let fullExpr = st.expr.trimEnd();
  if (fullExpr.endsWith(" ")) {
    fullExpr += st.result;
  }
  const parts = fullExpr.split(" ");
  if (parts.length < 2) return st;
  let a = parseNum(parts[0]);
  for (let i = 1; i < parts.length - 1; i += 2) {
    const op = parts[i] as Op;
    const b = parseNum(parts[i + 1]);
    switch (op) {
      case "+": a = a + b; break;
      case "-": a = a - b; break;
      case "×": a = a * b; break;
      case "÷": a = b === 0 ? NaN : a / b; break;
      case "^": a = Math.pow(a, b); break;
      default: break;
    }
  }
  return { ...st, result: fmt(a), error: !Number.isFinite(a), expr: "" };
}

const DEG_FACTOR = Math.PI / 180;

export function pressFunc(st: CalcState, fn: string): CalcState {
  if (st.error) return st;
  const v = parseNum(st.result);
  const af = st.angle === "DEG" ? DEG_FACTOR : 1;
  let r: number;
  switch (fn) {
    case "sin":   r = Math.sin(v * af); break;
    case "cos":   r = Math.cos(v * af); break;
    case "tan":   r = Math.tan(v * af); break;
    case "asin":  r = Math.asin(v) / af; break;
    case "acos":  r = Math.acos(v) / af; break;
    case "atan":  r = Math.atan(v) / af; break;
    case "ln":    r = v > 0 ? Math.log(v) : NaN; break;
    case "log":   r = v > 0 ? Math.log10(v) : NaN; break;
    case "sqrt":  r = v >= 0 ? Math.sqrt(v) : NaN; break;
    case "cbrt":  r = Math.cbrt(v); break;
    case "sq":    r = v * v; break;
    case "inv":   r = v !== 0 ? 1 / v : NaN; break;
    case "abs":   r = Math.abs(v); break;
    case "exp":   r = Math.exp(v); break;
    case "sign":  r = Math.sign(v); break;
    case "cube":  r = v * v * v; break;
    default: return st;
  }
  return { ...st, result: fmt(r), error: !Number.isFinite(r), expr: "" };
}

export function pressConst(st: CalcState, c: "pi" | "e"): CalcState {
  const val = c === "pi" ? PI : E;
  if (st.error) return { ...st, result: fmt(val), error: false, expr: "" };
  return { ...st, result: fmt(val), expr: "" };
}

export function clear(st: CalcState): CalcState {
  return { ...st, result: "0", expr: "", error: false };
}

export function allClear(_st: CalcState): CalcState {
  return { ...INIT };
}

export function backspace(st: CalcState): CalcState {
  if (st.error) return { ...st, result: "0", error: false };
  return { ...st, result: st.result.length > 1 ? st.result.slice(0, -1) : "0" };
}

export function toggleSign(st: CalcState): CalcState {
  if (st.error) return st;
  if (st.result === "0") return st;
  return {
    ...st,
    result: st.result.startsWith("-") ? st.result.slice(1) : "-" + st.result,
  };
}

export function toggleAngle(st: CalcState): CalcState {
  return { ...st, angle: st.angle === "DEG" ? "RAD" : "DEG" };
}

export function handleMem(st: CalcState, action: "M+" | "M-" | "MR" | "MC"): CalcState {
  const v = parseNum(st.result);
  switch (action) {
    case "M+": return { ...st, mem: { value: st.mem.value + v, hasValue: true } };
    case "M-": return { ...st, mem: { value: st.mem.value - v, hasValue: true } };
    case "MR": return { ...st, result: fmt(st.mem.value), expr: "" };
    case "MC": return { ...st, mem: { value: 0, hasValue: false } };
    default: return st;
  }
}

/* ── multi-step simulation ───────────────────────────── */

export function simulate(steps: string[]): CalcState {
  let st = INIT;
  for (const step of steps) {
    if (/^\d$/.test(step) || step === ".") {
      st = pressNum(st, step);
    } else if (step === "+") {
      st = pressOp(st, "+");
    } else if (step === "-") {
      st = pressOp(st, "-");
    } else if (step === "×") {
      st = pressOp(st, "×");
    } else if (step === "÷") {
      st = pressOp(st, "÷");
    } else if (step === "^") {
      st = pressOp(st, "^");
    } else if (step === "!") {
      st = pressOp(st, "!");
    } else if (step === "=") {
      st = pressEval(st);
    } else if (step.startsWith("fn:")) {
      st = pressFunc(st, step.slice(3));
    } else if (step.startsWith("const:")) {
      st = pressConst(st, step.slice(6) as "pi" | "e");
    } else if (step === "AC") {
      st = allClear(st);
    } else if (step === "C") {
      st = clear(st);
    } else if (step === "BS") {
      st = backspace(st);
    } else if (step === "±") {
      st = toggleSign(st);
    } else if (step === "DEG/RAD") {
      st = toggleAngle(st);
    } else if (step.startsWith("mem:")) {
      st = handleMem(st, step.slice(4) as "M+" | "M-" | "MR" | "MC");
    }
  }
  return st;
}
