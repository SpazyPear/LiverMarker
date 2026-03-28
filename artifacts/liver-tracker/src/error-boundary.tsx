import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("React render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            maxWidth: 720,
            margin: "40px auto",
            color: "#0f172a",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            {this.state.error.message}
          </pre>
          <pre
            style={{
              marginTop: 12,
              fontSize: 11,
              opacity: 0.85,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
