import React from "react";
import { ErrorPage } from "./ErrorPage";
import { ChunkErrorPage, isChunkLoadError } from "./ChunkErrorPage";

export type ErrorBoundaryVariant = "global" | "section";

interface Props {
  children: React.ReactNode;
  variant?: ErrorBoundaryVariant;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null, isChunkError: false });

  render() {
    const { error, isChunkError } = this.state;
    const { variant = "section", fallback } = this.props;

    if (error) {
      if (fallback) return fallback;
      if (isChunkError) return <ChunkErrorPage />;
      return <ErrorPage variant={variant} message={error.message || undefined} onAction={variant === "section" ? this.reset : undefined} />;
    }

    return this.props.children;
  }
}
