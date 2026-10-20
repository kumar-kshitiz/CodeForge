import Link from "next/link";
import CodePlayground from "../components/common/CodePlayground";
import StartCodingLink from "../components/common/StartCodingLink";

export default function Home() {
  return (
    <div className="playful-home">
      <section className="play-hero">
        <div className="play-hero-copy">
          <span className="eyebrow">
            <span className="little-star">✳</span> A LITTLE PRACTICE. A LOT OF
            POSSIBILITY.
          </span>
          <h1>
            Big ideas.
            <br />
            Better code.
            <br />
            <span>Your next level.</span>
          </h1>
          <p>
            A happy place to challenge your brain, sharpen your skills, and turn
            “almost” into “nailed it.” One coding challenge at a time.
          </p>
          <div className="hero-actions">
            <Link href="/problems" className="btn-primary-lg">
              Find your challenge ↗
            </Link>
            <a href="#how-it-works" className="text-link">
              Take a look around ↓
            </a>
          </div>
          <div className="hero-footnote">
            <span className="tiny-brackets">{"{ }"}</span> Your language. Your
            pace. Your lightbulb moment.
          </div>
        </div>
        <CodePlayground />
      </section>
      <div className="language-ribbon">
        <span>GOOD IDEAS SPEAK MANY LANGUAGES</span>
        <b>
          JavaScript <i>✳</i> Python <i>✳</i> C++ <i>✳</i> Your next
          breakthrough
        </b>
      </div>
      <section className="journey-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LESS GUESSWORK. MORE “GOT IT.”</span>
            <h2>
              Get a little better.
              <br />
              Have a little fun.
            </h2>
          </div>
          <p>
            From your first attempt to your best solution, there’s something to
            learn at every step.
          </p>
        </div>
        <div className="journey-grid">
          {[
            [
              "01",
              "mint",
              "⌘",
              "Meet your next challenge",
              "Stretch your problem-solving muscles with challenges that turn the fundamentals into second nature.",
            ],
            [
              "02",
              "peach",
              ">_",
              "Make something click",
              "Write real code in your browser. Explore an idea, test your logic, and give those edge cases a little attention.",
            ],
            [
              "03",
              "lilac",
              "✳",
              "Find your aha! moment",
              "Get AI-powered feedback on your approach, complexity, and readability. Take a useful lesson into your next attempt.",
            ],
          ].map(([number, color, icon, title, description]) => (
            <article className={`journey-card ${color}`} key={number}>
              <div className="card-top">
                <span className="feature-symbol">{icon}</span>
                <span>{number} /</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="practice-banner">
        <span className="banner-spark" aria-hidden="true">
          ✳
        </span>
        <div>
          <span className="eyebrow">SMALL STEPS. BIG BREAKTHROUGHS.</span>
          <h2>
            Your next “I did it!”
            <br />
            starts right here.
          </h2>
        </div>
        <StartCodingLink />
      </section>
      <footer className="site-footer">
        <Link href="/" className="brand">
          CodeForge.
        </Link>
        <p>Made for curious minds. Built for better code.</p>
        <Link href="/problems">Explore challenges ↗</Link>
      </footer>
    </div>
  );
}
