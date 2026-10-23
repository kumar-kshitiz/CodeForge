import { runDockerContainer, killDockerContainer } from "../docker/docker.util";
import { SANDBOX_CONFIG } from "../config/sandbox.config";
import { createWorkspace, cleanupWorkspace } from "../sandbox/workspace.util";
import type {
  LanguageRunner,
  RunnerOptions,
  RunnerResult,
} from "./runner.interface";
import { InstrumentationEngine } from "../instrumentation/engine";
import { TraceParser } from "../instrumentation/parser";
import { TraceCollector } from "../instrumentation/collector";
import { RuntimeAnalyzer } from "../instrumentation/analysis/analyzer";

export abstract class BaseRunner implements LanguageRunner {
  abstract readonly extension: string;
  abstract readonly image: string;

  /**
   * Defines how to execute the code.
   * By default, it runs a single container. Compiling languages can override this.
   */
  protected async runSteps(
    workspaceDir: string,
    containerName: string,
    timeLimitMs: number,
    memoryLimitMb: number,
  ): Promise<RunnerResult> {
    const startTime = Date.now();

    const dockerPromise = runDockerContainer({
      image: this.image,
      containerName,
      memory: `${memoryLimitMb}m`,
      cpus: SANDBOX_CONFIG.CPUS,
      volumes: [`${workspaceDir}:/workspace:ro`],
      command: this.getExecutionCommand(),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), timeLimitMs);
    });

    try {
      const result = await Promise.race([dockerPromise, timeoutPromise]);
      let runtimeMs = Date.now() - startTime;
      // Deduct Docker overhead (~350ms) to approximate true execution time like an IDE
      // runtimeMs = Math.max(1, runtimeMs - 350);

      // Parse Traces
      const lineOffset = InstrumentationEngine.getInjectionOffset(
        this.extension,
      );
      const parsed = TraceParser.parse(
        result.stderr,
        result.stdout,
        lineOffset,
      );
      const traceData = TraceCollector.processTraces(parsed.traces);
      const intelligence = RuntimeAnalyzer.analyze(
        traceData.snapshot,
        parsed.cleanedStderr,
        null,
      );

      return {
        verdict: "accepted",
        stdout: parsed.cleanedStdout,
        stderr: parsed.cleanedStderr,
        runtimeMs,
        snapshot: traceData.snapshot,
        runtimeIntelligence: intelligence,
      };
    } catch (err: any) {
      let runtimeMs = Date.now() - startTime;
      // runtimeMs = Math.max(1, runtimeMs - 350);

      // For errors, we also want to parse traces to see what happened before crash
      const lineOffset = InstrumentationEngine.getInjectionOffset(
        this.extension,
      );
      const parsed = TraceParser.parse(
        err.stderr || err.message,
        err.stdout || "",
        lineOffset,
      );
      const traceData = TraceCollector.processTraces(parsed.traces);

      let exitSignal: string | null = null;
      if (err.message === "TIMEOUT") exitSignal = "TIMEOUT";
      // In a real docker run, err might contain the exit code or signal (e.g. err.code === 139)
      if (err.code === 139) exitSignal = "SIGSEGV";
      if (err.code === 136) exitSignal = "SIGFPE";

      const intelligence = RuntimeAnalyzer.analyze(
        traceData.snapshot,
        parsed.cleanedStderr,
        exitSignal,
      );

      if (err.message === "TIMEOUT") {
        await killDockerContainer(containerName);
        return {
          verdict: "time_limit_exceeded",
          stdout: parsed.cleanedStdout,
          stderr:
            parsed.cleanedStderr + `\nExecution exceeded ${timeLimitMs}ms.`,
          runtimeMs: timeLimitMs,
          snapshot: traceData.snapshot,
          runtimeIntelligence: intelligence,
        };
      }

      return {
        verdict: "runtime_error",
        stdout: parsed.cleanedStdout,
        stderr: parsed.cleanedStderr,
        runtimeMs,
        snapshot: traceData.snapshot,
        runtimeIntelligence: intelligence,
      };
    }
  }

  protected abstract getExecutionCommand(): string;

  protected preprocessCode(code: string): string {
    const lang =
      this.extension === "py"
        ? "python"
        : this.extension === "js"
          ? "javascript"
          : "cpp";

    return InstrumentationEngine.instrument(code, lang);
  }

  protected async compile(
    workspaceDir: string,
    submissionId: string,
    memoryLimitMb: number,
  ): Promise<RunnerResult | null> {
    // Default implementation: interpreted languages don't need compilation
    return null;
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const {
      submissionId,
      code,
      timeLimitMs,
      memoryLimitMb,
      testCases,
    } = options;
    let workspace;

    const finalCode = this.preprocessCode(code);

    try {
      workspace = await createWorkspace(finalCode, this.extension);

      const compileResult = await this.compile(
        workspace.dirPath,
        submissionId,
        memoryLimitMb,
      );
      if (compileResult && compileResult.verdict !== "accepted") {
        return compileResult;
      }

      if (!testCases || testCases.length === 0) {
        // Fallback for no test cases
        const fs = require("fs");
        const path = require("path");
        fs.writeFileSync(path.join(workspace.dirPath, "input.txt"), "");
        const containerName = `codeforge-exec-${submissionId}`;
        const result = await this.runSteps(
          workspace.dirPath,
          containerName,
          timeLimitMs,
          memoryLimitMb,
        );
        return {
          verdict: result.verdict,
          stdout: result.stdout,
          stderr: result.stderr,
          runtimeMs: result.runtimeMs,
          snapshot: result.snapshot,
          runtimeIntelligence: result.runtimeIntelligence,
          passedTestCases: 0,
          totalTestCases: 0,
        };
      }

      let passed = 0;
      let totalRuntime = 0;
      const testResults: NonNullable<RunnerResult["testResults"]> = [];

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const containerName = `codeforge-exec-${submissionId}-${i}`;

        // Write input to workspace
        const fs = require("fs");
        const path = require("path");
        fs.writeFileSync(
          path.join(workspace.dirPath, "input.txt"),
          tc.input || "",
        );

        const result = await this.runSteps(
          workspace.dirPath,
          containerName,
          timeLimitMs,
          memoryLimitMb,
        );
        totalRuntime += result.runtimeMs;

        if (result.verdict !== "accepted") {
          testResults.push({
            testCaseId: tc.id,
            verdict: result.verdict,
            runtimeMs: result.runtimeMs,
            memoryKb: result.memoryKb,
          });
          return {
            verdict: result.verdict,
            stdout: result.stdout,
            stderr: result.stderr,
            runtimeMs: totalRuntime,
            snapshot: result.snapshot,
            runtimeIntelligence: result.runtimeIntelligence,
            passedTestCases: passed,
            totalTestCases: testCases.length,
            failedTestCase:
              tc.visibility === "HIDDEN"
                ? undefined
                : {
                    input: tc.input,
                    expected: tc.expectedOutput,
                    actual: result.stdout || result.stderr,
                  },
            testResults,
          };
        }

        // Normalize outputs for comparison (Token-based matching)
        const normalize = (s: string) =>
          (s || "").trim().split(/\s+/).join(" ");
        const actualOut = normalize(result.stdout);
        const expectedOut = normalize(tc.expectedOutput);

        if (actualOut !== expectedOut) {
          testResults.push({
            testCaseId: tc.id,
            verdict: "wrong_answer",
            runtimeMs: result.runtimeMs,
            memoryKb: result.memoryKb,
          });
          return {
            verdict: "wrong_answer",
            stdout: result.stdout,
            stderr: result.stderr,
            runtimeMs: totalRuntime,
            snapshot: result.snapshot,
            runtimeIntelligence: result.runtimeIntelligence,
            passedTestCases: passed,
            totalTestCases: testCases.length,
            failedTestCase:
              tc.visibility === "HIDDEN"
                ? undefined
                : {
                    input: tc.input,
                    expected: expectedOut,
                    actual: actualOut,
                  },
            testResults,
          };
        }

        passed++;
        testResults.push({
          testCaseId: tc.id,
          verdict: "accepted",
          runtimeMs: result.runtimeMs,
          memoryKb: result.memoryKb,
        });
      }

      return {
        verdict: "accepted",
        stdout: "",
        stderr: "",
        runtimeMs: totalRuntime,
        passedTestCases: passed,
        totalTestCases: testCases.length,
        testResults,
      };
    } finally {
      if (workspace) {
        await cleanupWorkspace(workspace.dirPath);
      }
    }
  }
}
