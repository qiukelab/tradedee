import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const calculatorPath = fileURLToPath(new URL("../python/calculator.py", import.meta.url));

export async function calculateForecast(payload, pythonExecutable = process.env.PYTHON_EXECUTABLE ?? "python") {
  return new Promise((resolve, reject) => {
    const process = spawn(pythonExecutable, [calculatorPath], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    process.stdout.on("data", (chunk) => { stdout += chunk; });
    process.stderr.on("data", (chunk) => { stderr += chunk; });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || "Python calculation failed"));
      else {
        try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); }
      }
    });
    process.stdin.end(JSON.stringify(payload));
  });
}
