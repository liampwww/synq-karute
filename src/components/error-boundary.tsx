"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <span className="text-2xl">!</span>
              </div>
              <h3 className="text-lg font-semibold">
                エラーが発生しました
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message ?? "予期しないエラーが発生しました"}
              </p>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                variant="outline"
              >
                再試行
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
