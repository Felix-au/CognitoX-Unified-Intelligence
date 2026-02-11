export default function ToolsHeading({ firstPart, secondPart }: { firstPart: string; secondPart?: string }) {
  return (
    <div className="tools-heading-container">
      <h2>
        {firstPart} <span className="gradient-text">{secondPart}</span>
      </h2>
      <style jsx>{`
        .tools-heading-container {
          margin-bottom: 24px;
          text-align: center;
        }
        h2 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
