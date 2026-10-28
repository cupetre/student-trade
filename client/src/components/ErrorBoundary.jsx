import React from 'react';
import { useLocation } from 'react-router-dom';

// If a page crashes while rendering, show a friendly message instead of a
// blank white screen. The error itself is logged to the console (see main.jsx).
class Boundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div style={styles.wrap} role="alert">
                <div style={styles.card}>
                    <h1 style={styles.title}>Something went wrong on this page</h1>
                    <p style={styles.text}>Try again, or go back to the start. If it keeps happening, tell us what you clicked.</p>
                    {import.meta.env.DEV && <pre style={styles.pre}>{String(this.state.error?.message || this.state.error)}</pre>}
                    <div style={styles.actions}>
                        <button type="button" style={styles.primary} onClick={() => window.location.reload()}>Reload</button>
                        <a href="/" style={styles.secondary}>Go to the start</a>
                    </div>
                </div>
            </div>
        );
    }
}

// Navigating to another page clears the error (the key changes per location)
const ErrorBoundary = ({ children }) => {
    const location = useLocation();
    return <Boundary key={location.pathname}>{children}</Boundary>;
};

const styles = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f8fc' },
    card: { maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #dce3ed', borderRadius: 14, padding: 24, textAlign: 'left', color: '#13233a' },
    title: { fontSize: '1.3rem', margin: '0 0 8px' },
    text: { margin: '0 0 16px', color: '#5d6b7e', lineHeight: 1.5 },
    pre: { background: '#fdecea', color: '#b42318', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: '0.85rem', margin: '0 0 16px' },
    actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    primary: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2c66a8', color: '#fff', fontWeight: 700, cursor: 'pointer', font: 'inherit' },
    secondary: { padding: '10px 18px', borderRadius: 10, border: '1px solid #dce3ed', color: '#2c66a8', fontWeight: 700, textDecoration: 'none' },
};

export default ErrorBoundary;
