import CodePlayground from "../../components/common/CodePlayground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">WELCOME TO YOUR CODING HAPPY PLACE</span>
        <h2>
          Stay curious.
          <br />
          Build confidence.
          <br />
          <em>Make it click.</em>
        </h2>
        <CodePlayground />
        <p>Practice at your own pace. Learn something with every attempt.</p>
      </aside>
      {children}
    </div>
  );
}
