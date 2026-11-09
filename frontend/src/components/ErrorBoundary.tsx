import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkError } from '../lib/lazyRetry';

interface Props {
  children: ReactNode;
  /** When this value changes (for example the route), a shown error is cleared and the children render again. */
  resetKey?: unknown;
  /** Smaller card for use inside the page; the default fills the screen for the app-level boundary. */
  inline?: boolean;
}
interface State {
  error: Error | null;
}

/**
 * Without a boundary, one failed file or one render error unmounts the whole React tree and the visitor sees a
 * blank page. This keeps the failure local and offers a way out.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Plumbline UI error:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div
        role="alert"
        className={`grid place-items-center px-4 ${this.props.inline ? 'min-h-[50vh]' : 'min-h-screen'}`}
      >
        <div className="card-pad max-w-md text-center">
          <h2 className="text-2xl font-semibold">
            {chunk ? 'This page could not be loaded' : 'Something went wrong on this page'}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {chunk
              ? 'The connection dropped, or the site was updated while this tab was open. Reloading fetches the newest version.'
              : 'The rest of the app is fine. You can try again or reload.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {!chunk && (
              <button className="btn" onClick={() => this.setState({ error: null })}>
                Try again
              </button>
            )}
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
