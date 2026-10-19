export default function CodePlayground() {
  return (
    <div
      className="code-playground"
      role="img"
      aria-label="Floating code editor with an example successful solution and a mint coding mascot"
    >
      <div className="orbit-ring" />
      <span className="floating-spark" aria-hidden="true">
        ✳
      </span>
      <div className="code-window">
        <div className="code-window-bar">
          <div className="chrome-dots">
            <span />
            <span />
            <span />
          </div>
          <span>your-next-aha.js</span>
          <span>↗</span>
        </div>
        <div className="code-window-content">
          <span className="code-comment">
            {"// A little curiosity goes a long way."}
          </span>
          <pre>
            <span className="code-purple">function</span>
            {
              " twoSum(nums, target) {\n  const seen = new Map();\n\n  for (const [i, n] of nums.entries()) {\n    if (seen.has(target - n)) {\n      "
            }
            <span className="code-purple">return</span>
            {" [seen.get(target - n), i];\n    }\n    seen.set(n, i);\n  }\n}"}
          </pre>
        </div>
        <div className="code-window-bottom">
          <span>● JavaScript</span>
          <span>Keep exploring ✧</span>
        </div>
      </div>
      <div className="success-sticker">
        <span>✓</span>
        <div>
          <b>That’s the feeling.</b>
          <small>Example · all test cases passed</small>
        </div>
      </div>
      <div className="code-mascot" aria-hidden="true">
        <div className="mascot-face">
          <i />
          <i />
          <span />
        </div>
        <span className="mascot-label">{"< / >"}</span>
      </div>
      <div className="idea-sticker">a little more curious ↗</div>
    </div>
  );
}
