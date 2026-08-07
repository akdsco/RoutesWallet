import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last-resort guard: a render/runtime error in any child (e.g. one malformed
 * route from the CDN-served data) would otherwise unmount the whole tree to a
 * blank page. This shows a recoverable message instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RoutesWallet crashed:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'flex-start',
          maxWidth: '32rem',
          margin: '10vh auto',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <strong style={{ fontSize: '16px' }}>Something went wrong</strong>
        <span style={{ color: '#4b5660', fontSize: '14px', lineHeight: 1.5 }}>
          The map failed to load. This is usually temporary — reloading the page
          normally fixes it.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            borderRadius: '8px',
            border: '1px solid #e1e5e8',
            padding: '8px 14px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
