import { useState, useCallback, useRef } from "react";

/* ── helpers ─────────────────────────────────────────── */
const PI = Math.PI;
const E = Math.E;

type Op = "+" | "-" | "×" | "÷" | "^" | "!";

interface Mem {
  value: number;
  hasValue: boolean;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  const s = n.toPrecision(12);
  return parseFloat(s).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

/* ── button types ─────────────────────────────────────── */
type BtnKind =
  | "num"
  | "op"
  | "func"
  | "const"
  | "mem"
  | "paren"
  | "clear"
  | "eval"
  | "angle";

interface Btn {
  label: string;
  kind: BtnKind;
  action?: string;
  cls?: string;
}

const DEG = "\u00B0";

/* ── main component ──────────────────────────────────── */
export default function CalcPage() {
  const [expr, setExpr] = useState("");          // current expression
  const [result, setResult] = useState("0");      // displayed result
  const [angle, setAngle] = useState<"DEG" | "RAD">("DEG");
  const [mem, setMem] = useState<Mem>({ value: 0, hasValue: false });
  const [error, setError] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const angleFactor = angle === "DEG" ? Math.PI / 180 : 1;


  const runBinary = useCallback(
    (op: Op) => {
      let fullExpr = expr.trimEnd();
      if (fullExpr.endsWith(" ")) {
        fullExpr += result;
      }
      const parts = fullExpr.split(" ");
      if (parts.length < 2) return;
      let a = parseNum(parts[0]);
      for (let i = 1; i < parts.length - 1; i += 2) {
        const prevOp = parts[i] as Op;
        const b = parseNum(parts[i + 1]);
        switch (prevOp) {
          case "+": a = a + b; break;
          case "-": a = a - b; break;
          case "×": a = a * b; break;
          case "÷": a = b === 0 ? NaN : a / b; break;
          case "^": a = Math.pow(a, b); break;
          default: break;
        }
      }
      const r = fmt(a);
      setExpr(`${r} ${op} `);
      setResult(r);
      setError(!Number.isFinite(a));
    },
    [expr, result]
  );

  const pressOp = useCallback(
    (op: Op) => {
      if (error) return;
      if (op === "!") {
        const v = parseNum(result);
        const r = factorial(Math.round(v));
        setResult(fmt(r));
        setError(!Number.isFinite(r));
        setExpr("");
        return;
      }
      if (expr && !expr.endsWith(" ")) {
        runBinary(op);
      } else if (expr === "" && result !== "0") {
        setExpr(`${result} ${op} `);
      }
    },
    [expr, result, error, runBinary]
  );

  const pressNum = useCallback(
    (digit: string) => {
      if (error) { setResult(digit); setError(false); setExpr(""); return; }
      if (expr && expr.endsWith(" ")) {
        setExpr((prev) => prev + digit);
        setResult(digit === "." ? "0." : digit);
        return;
      }
      if (expr) {
        setExpr((prev) => prev + digit);
        setResult((prev) => {
          if (prev === "0" && digit !== ".") return digit;
          if (digit === "." && prev.includes(".")) return prev;
          return prev + digit;
        });
        return;
      }
      setResult((prev) => {
        if (prev === "0" && digit !== ".") return digit;
        if (digit === "." && prev.includes(".")) return prev;
        return prev + digit;
      });
    },
    [error, expr]
  );

  const pressEval = useCallback(() => {
    if (error) return;
    // Build full expression: if expr ends with an operator, append the current result
    let fullExpr = expr.trimEnd();
    if (fullExpr.endsWith(" ")) {
      fullExpr += result;
    }
    const parts = fullExpr.split(" ");
    if (parts.length < 2) return;
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
    setResult(fmt(a));
    setError(!Number.isFinite(a));
    setExpr("");
  }, [expr, result, error]);

  const pressFunc = useCallback(
    (fn: string) => {
      if (error) return;
      const v = parseNum(result);
      let r: number;
      switch (fn) {
        case "sin":   r = Math.sin(v * angleFactor); break;
        case "cos":   r = Math.cos(v * angleFactor); break;
        case "tan":   r = Math.tan(v * angleFactor); break;
        case "asin":  r = Math.asin(v) / angleFactor; break;
        case "acos":  r = Math.acos(v) / angleFactor; break;
        case "atan":  r = Math.atan(v) / angleFactor; break;
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
        default: return;
      }
      setResult(fmt(r));
      setError(!Number.isFinite(r));
      setExpr("");
    },
    [result, angleFactor, error]
  );

  const pressConst = useCallback(
    (c: "pi" | "e") => {
      if (error) { setResult(c === "pi" ? fmt(PI) : fmt(E)); setError(false); setExpr(""); return; }
      setResult(c === "pi" ? fmt(PI) : fmt(E));
      setExpr("");
    },
    [error]
  );

  const clear = useCallback(() => {
    setResult("0");
    setExpr("");
    setError(false);
  }, []);

  const allClear = useCallback(() => {
    setResult("0");
    setExpr("");
    setError(false);
    setMem({ value: 0, hasValue: false });
  }, []);

  const backspace = useCallback(() => {
    if (error) { setResult("0"); setError(false); return; }
    setResult((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  }, [error]);

  const toggleSign = useCallback(() => {
    if (error) return;
    setResult((prev) => {
      if (prev === "0") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, [error]);

  const toggleAngle = useCallback(() => {
    setAngle((a) => (a === "DEG" ? "RAD" : "DEG"));
  }, []);

  const handleMem = useCallback(
    (action: "M+" | "M-" | "MR" | "MC") => {
      const v = parseNum(result);
      switch (action) {
        case "M+": setMem((m) => ({ value: m.value + v, hasValue: true })); break;
        case "M-": setMem((m) => ({ value: m.value - v, hasValue: true })); break;
        case "MR": setResult(fmt(mem.value)); setExpr(""); break;
        case "MC": setMem({ value: 0, hasValue: false }); break;
      }
    },
    [result, mem.value]
  );

  /* ── layout helpers ──────────────────────────────────── */
  const btn = (
    label: string,
    kind: BtnKind,
    action?: string,
    cls = ""
  ): Btn => ({ label, kind, action, cls });

  const rows: Btn[][] = [
    // row 0: MC MR M+ M-
    [btn("MC", "mem", "MC"), btn("MR", "mem", "MR"), btn("M+", "mem", "M+"), btn("M\u2212", "mem", "M-")],
    // row 1: scientific
    [btn("sin", "func", "sin"), btn("cos", "func", "cos"), btn("tan", "func", "tan"), btn("\u03C0", "const", "pi")],
    // row 2
    [btn("log", "func", "log"), btn("ln", "func", "ln"), btn("\u221A", "func", "sqrt"), btn("x\u00B2", "func", "sq")],
    // row 3
    [btn("x\u02B8", "op", "^"), btn("1/x", "func", "inv"), btn("!", "op", "!"), btn("e", "const", "e")],
    // row 4: 7 8 9 ÷
    [btn("7", "num"), btn("8", "num"), btn("9", "num"), btn("\u00F7", "op", "\u00F7")],
    // row 5: 4 5 6 ×
    [btn("4", "num"), btn("5", "num"), btn("6", "num"), btn("\u00D7", "op", "\u00D7")],
    // row 6: 1 2 3 -
    [btn("1", "num"), btn("2", "num"), btn("3", "num"), btn("\u2212", "op", "\u2212")],
    // row 7: 0 . +-
    [btn("0", "num"), btn(".", "num"), btn("\u00B1", "num"), btn("\u002B", "op", "+")],
    // row 8: AC C ⌫ =
    [btn("AC", "clear", "AC", "calc-accent"), btn("C", "clear", "C"), btn("\u232B", "clear", "\u232B"), btn("=", "eval", "=")],
  ];

  function onPress(b: Btn) {
    if (b.kind === "num" && b.label === "\u00B1") { toggleSign(); return; }
    if (b.kind === "num") { pressNum(b.label); return; }
    if (b.kind === "op") {
      const opMap: Record<string, Op> = { "\u00D7": "×", "\u00F7": "÷", "\u2212": "-", "\u002B": "+", "^": "^", "!": "!" };
      if (b.action === "\u232B") { backspace(); return; }
      if (b.action === "=") { pressEval(); return; }
      const op = opMap[b.label] ?? b.label as Op;
      pressOp(op);
      return;
    }
    if (b.kind === "func") { pressFunc(b.action!); return; }
    if (b.kind === "const") { pressConst(b.action as "pi" | "e"); return; }
    if (b.kind === "mem") { handleMem(b.action as "M+" | "M-" | "MR" | "MC"); return; }
    if (b.kind === "clear") {
      if (b.action === "AC") allClear();
      else if (b.action === "C") clear();
      else if (b.label === "\u232B") backspace();
      return;
    }
    if (b.kind === "eval") { pressEval(); return; }
  }

  function btnCls(b: Btn): string {
    const base = "calc-btn";
    if (b.cls) return `${base} ${b.cls}`;
    if (b.kind === "num") return `${base} calc-num`;
    if (b.kind === "op") return `${base} calc-op`;
    if (b.kind === "func") return `${base} calc-func`;
    if (b.kind === "const") return `${base} calc-func`;
    if (b.kind === "mem") return `${base} calc-mem`;
    if (b.kind === "eval") return `${base} calc-eval`;
    if (b.kind === "clear") return `${base} calc-clear`;
    return base;
  }

  return (
    <div className="calc-shell">
      {/* display */}
      <div className="calc-display">
        <div className="calc-expr">{expr || "\u00A0"}</div>
        <div className="calc-result" ref={resultRef} data-error={error}>
          {result}
        </div>
        <div className="calc-status">
          {angle === "DEG" ? "DEG" : "RAD"}
          {mem.hasValue && <span className="calc-mem-indicator">M</span>}
        </div>
      </div>

      {/* angle toggle */}
      <button className="calc-angle-toggle" onClick={toggleAngle}>
        {angle === "DEG" ? `DEG ${DEG}` : "RAD"}
      </button>

      {/* keypad */}
      <div className="calc-keypad">
        {rows.map((row, ri) => (
          <div key={ri} className="calc-row">
            {row.map((b) => (
              <button
                key={b.label}
                className={btnCls(b)}
                onClick={() => onPress(b)}
              >
                {b.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
