import * as React from "react";
import DegradedFallback from "@/components/ErrorBoundaryFallback";

interface Props {
  children: React.ReactNode;
  /**
   * Optional section identifier used to scope the degraded fallback UI text.
   */
  name?: string;
  /**
   * Custom fallback override (used by tests or callers needing a richer UI).
   */
  fallback?: React.ReactNode;
  /**
   * Optional error callback (e.g. for future logging/telemetry integration).
   * Called once per caught error.
   */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Section-level ErrorBoundary used to isolate failures in business blocks
 * (e.g. firmware flashing, character deploy, soulpod download) so a single
 * crash never tears down the whole page.
 *
 * infra-001: now supports a `name` (logged on crash) and forwards rendering
 * of the degraded UI to ErrorBoundaryFallback so this file only exports a
 * class component (react-refresh/only-export-components).
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", this.props.name ?? "(unnamed)", error, info);
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DegradedFallback onRetry={this.handleRetry} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
