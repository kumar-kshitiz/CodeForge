import { CppRunner } from './cpp.runner';

async function main() {
  const runner = new CppRunner();
  console.log("=== COMPILATION ERROR TEST ===");
  const res1 = await runner.execute({
    submissionId: 'test-1',
    code: 'int main() { return x; }', // 'x' was not declared
    problemSlug: undefined,
    testCases: []
  });
  console.log(res1);

  console.log("=== RUNTIME ERROR TEST ===");
  const res2 = await runner.execute({
    submissionId: 'test-2',
    code: 'int main() { int* p = 0; *p = 1; return 0; }', // Segfault
    problemSlug: undefined,
    testCases: [{ input: '', expectedOutput: '', isHidden: false }]
  });
  console.log(res2);
}
main();
