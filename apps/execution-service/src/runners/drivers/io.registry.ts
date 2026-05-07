export const IO_REGISTRY: Record<string, Record<string, string>> = {
  'two-sum': {
    javascript: `
// --- Auto-Generated Standard I/O Wrapper ---
const fs = require('fs');
function __main__() {
  const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (!input || input.length === 0 || input[0] === '') return;
  const n = parseInt(input[0]);
  const nums = [];
  for(let i=1; i<=n; i++) nums.push(parseInt(input[i]));
  const target = parseInt(input[n+1]);
  const res = twoSum(nums, target);
  if (res) console.log(res.join(' '));
}
__main__();
`,
    python: `
# --- Auto-Generated Standard I/O Wrapper ---
import sys
def __main__():
    input_data = sys.stdin.read().split()
    if not input_data: return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])
    res = twoSum(nums, target)
    if res:
        print(" ".join(map(str, res)))

if __name__ == '__main__':
    __main__()
`,
    cpp: `
// --- Auto-Generated Standard I/O Wrapper ---
#include <iostream>
int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    std::vector<int> nums(n);
    for(int i=0; i<n; i++) std::cin >> nums[i];
    int target;
    std::cin >> target;
    std::vector<int> res = twoSum(nums, target);
    for(size_t i=0; i<res.size(); i++) {
        std::cout << res[i] << (i == res.size()-1 ? "" : " ");
    }
    std::cout << std::endl;
    return 0;
}
`
  },
  'reverse-string': {
    javascript: `
// --- Auto-Generated Standard I/O Wrapper ---
const fs = require('fs');
function __main__() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;
  const s = input.split('');
  reverseString(s);
  console.log(s.join(''));
}
__main__();
`,
    python: `
# --- Auto-Generated Standard I/O Wrapper ---
import sys
def __main__():
    input_data = sys.stdin.read().strip()
    if not input_data: return
    s = list(input_data)
    reverseString(s)
    print("".join(s))

if __name__ == '__main__':
    __main__()
`,
    cpp: `
// --- Auto-Generated Standard I/O Wrapper ---
#include <iostream>
#include <string>
int main() {
    std::string input;
    if (!(std::cin >> input)) return 0;
    std::vector<char> s(input.begin(), input.end());
    reverseString(s);
    for(char c : s) std::cout << c;
    std::cout << std::endl;
    return 0;
}
`
  }
};
