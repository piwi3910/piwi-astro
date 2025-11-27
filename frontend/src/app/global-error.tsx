'use client';

/**
 * Global error boundary for Next.js App Router.
 * This component renders its own <html> and <body> tags because
 * it replaces the entire document when the root layout fails.
 *
 * IMPORTANT: This file must NOT use any React hooks that depend on context
 * (like useState, useContext, etc.) at the top level during SSR/prerendering.
 * It uses only inline styles to avoid any CSS-in-JS context issues.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '500px',
          }}
        >
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#c9d1d9',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: '#8b949e',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}
          >
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6e7681',
                marginBottom: '1.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#ffffff',
              background: '#228be6',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
