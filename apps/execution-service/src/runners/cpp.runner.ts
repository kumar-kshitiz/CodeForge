import { BaseRunner } from "./base.runner";
import { runDockerContainer, killDockerContainer } from "../docker/docker.util";
import { SANDBOX_CONFIG } from "../config/sandbox.config";
import type { RunnerResult } from "./runner.interface";
import { InstrumentationEngine } from "../instrumentation/engine";
import { TraceParser } from "../instrumentation/parser";

export class CppRunner extends BaseRunner {
  readonly extension = "cpp";
  readonly image = "gcc:latest";

  protected getExecutionCommand(): string {
    return `sh -c "/workspace/a.out < /workspace/input.txt"`;
  }

  protected async compile(
    workspaceDir: string,
    submissionId: string,
    memoryLimitMb: number,
  ): Promise<RunnerResult | null> {
    const startTime = Date.now();
    try {
      await runDockerContainer({
        image: this.image,
        containerName: `codeforge-exec-${submissionId}-compile`,
        memory: `${memoryLimitMb}m`,
        cpus: SANDBOX_CONFIG.CPUS,
        volumes: [`${workspaceDir}:/workspace:rw`],
        command: `g++ -std=c++20 /workspace/source.cpp -o /workspace/a.out`,
      });
      return {
        verdict: "accepted",
        stdout: "",
        stderr: "",
        runtimeMs: Date.now() - startTime,
      };
    } catch (compileErr: any) {
      const rawStderr = compileErr.stderr || compileErr.message;
      const rawStdout = compileErr.stdout || "";
      const lineOffset = InstrumentationEngine.getInjectionOffset("cpp");
      const parsed = TraceParser.parse(rawStderr, rawStdout, lineOffset);

      return {
        verdict: "compilation_error",
        stdout: parsed.cleanedStdout,
        stderr: parsed.cleanedStderr,
        runtimeMs: Date.now() - startTime,
      };
    }
  }
}
