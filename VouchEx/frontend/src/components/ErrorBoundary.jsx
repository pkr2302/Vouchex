import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#061228',
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>VouchEx could not load</h1>
            <p style={{ color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
              Something went wrong in the browser. Try a hard refresh (Ctrl+Shift+R) or clear cache.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
