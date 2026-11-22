import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Fängt Render-Fehler in der gesamten App ab, damit ein einzelner
 * Fehler nicht die komplette Oberfläche (weißer Bildschirm) lahmlegt.
 * Die lokalen Daten im localStorage bleiben erhalten und können neu
 * geladen werden.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unerwarteter Fehler in der Anwendung:', error, info);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020d18',
          color: '#e5e7eb',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#58B49D' }}>
            Es ist ein unerwarteter Fehler aufgetreten
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Die Anwendung konnte nicht korrekt dargestellt werden. Ihre gespeicherten
            Daten sind weiterhin lokal vorhanden. Bitte laden Sie die Seite neu.
          </p>
          {this.state.error && (
            <pre
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: '#f87171',
                overflowX: 'auto',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              marginTop: '1.25rem',
              padding: '0.6rem 1.25rem',
              background: '#facc15',
              color: '#020d18',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }
}
