import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const twoSum = await prisma.problem.upsert({
    where: { slug: 'two-sum' },
    update: {},
    create: {
      slug: 'two-sum',
      title: 'Two Sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      difficulty: 'easy',
      starterCode: {
        javascript: 'function twoSum(nums, target) {\n  // Write your code here\n}',
        python: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
        cpp: '#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your code here\n}'
      },
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
      ],
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.'
      ],
      tags: {
        connectOrCreate: [
          { where: { name: 'Array' }, create: { name: 'Array' } },
          { where: { name: 'Hash Table' }, create: { name: 'Hash Table' } }
        ]
      }
    }
  });

  const reverseString = await prisma.problem.upsert({
    where: { slug: 'reverse-string' },
    update: {},
    create: {
      slug: 'reverse-string',
      title: 'Reverse String',
      description: 'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
      difficulty: 'easy',
      starterCode: {
        javascript: 'function reverseString(s) {\n  // Write your code here\n}',
        python: 'def reverseString(s):\n    # Write your code here\n    pass',
        cpp: '#include <vector>\nusing namespace std;\n\nvoid reverseString(vector<char>& s) {\n    // Write your code here\n}'
      },
      examples: [
        { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
        { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' }
      ],
      constraints: [
        '1 <= s.length <= 10^5',
        's[i] is a printable ascii character.'
      ],
      tags: {
        connectOrCreate: [
          { where: { name: 'Two Pointers' }, create: { name: 'Two Pointers' } },
          { where: { name: 'String' }, create: { name: 'String' } }
        ]
      }
    }
  });

  console.log({ twoSum, reverseString });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
