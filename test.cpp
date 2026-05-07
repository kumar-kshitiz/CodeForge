#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        return {0,1};
    }
};

int main() {
    Solution sol;
    vector<int> nums = {2,7,11,15};
    vector<int> res = sol.twoSum(nums, 9);
    cout << res[0] << "," << res[1] << endl;
    return 0;
}
