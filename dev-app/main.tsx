import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

// ── Bootstrap Optate overlay directly from source (HMR-aware) ──────────────
import '../src/client';

// ── Sample React components with real named components ─────────────────────
// These names will show in the Optate inspector: LoginButton › HeroCard › App

const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = '#3b82f6' }) => (
  <span style={{
    display: 'inline-block', padding: '2px 10px', borderRadius: 99,
    background: color + '22', color, fontSize: 12, fontWeight: 600, fontFamily: 'system-ui',
  }}>
    {text}
  </span>
);

const LoginButton: React.FC<{ label?: string }> = ({ label = 'Get Started' }) => {
  const [clicked, setClicked] = useState(false);
  return (
    <button
      onClick={() => setClicked(c => !c)}
      style={{
        background: clicked ? '#16a34a' : '#c75b39', color: '#fff',
        border: 'none', padding: '10px 24px', borderRadius: 8,
        fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui',
        transition: 'background 0.2s',
      }}
    >
      {clicked ? '✓ Clicked!' : label}
    </button>
  );
};

const FeatureTag: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', background: '#f5f5f5', borderRadius: 8,
    fontSize: 13, fontFamily: 'system-ui', color: '#333',
  }}>
    <span>{icon}</span>
    <span>{label}</span>
  </div>
);

const HeroCard: React.FC = () => (
  <div style={{
    background: '#fff', borderRadius: 16, padding: 32,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20,
    fontFamily: 'system-ui',
  }}>
    <div style={{ marginBottom: 12 }}>
      <Badge text="New" color="#8b5cf6" />
    </div>
    <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#111' }}>
      Optate Dev Sandbox
    </h2>
    <p style={{ margin: '0 0 20px', color: '#666', lineHeight: 1.6 }}>
      Click any element on this page to inspect it. Component names like{' '}
      <strong>HeroCard</strong>, <strong>FeatureTag</strong>, <strong>LoginButton</strong>{' '}
      will appear in the Optate panel because this is a live React app with HMR.
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
      <FeatureTag icon="⚡" label="HMR — no rebuild needed" />
      <FeatureTag icon="🔬" label="Real component names" />
      <FeatureTag icon="🎯" label="Fiber tree inspection" />
    </div>
    <LoginButton label="Inspect Me" />
  </div>
);

const StatsRow: React.FC = () => (
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20,
  }}>
    {[
      { label: 'Components', value: '12', color: '#3b82f6' },
      { label: 'Elements', value: '48', color: '#10b981' },
      { label: 'Changes', value: '0', color: '#f97316' },
    ].map(stat => (
      <div key={stat.label} style={{
        background: '#fff', borderRadius: 12, padding: '16px 20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', fontFamily: 'system-ui',
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{stat.label}</div>
      </div>
    ))}
  </div>
);

const FormField: React.FC<{ label: string; placeholder: string; type?: string }> = ({
  label, placeholder, type = 'text',
}) => (
  <div style={{ marginBottom: 16, fontFamily: 'system-ui' }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 6 }}>
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '10px 14px',
        border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14,
        outline: 'none', fontFamily: 'inherit', color: '#111',
      }}
    />
  </div>
);

const LoginForm: React.FC = () => (
  <div style={{
    background: '#fff', borderRadius: 16, padding: 28,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20,
    fontFamily: 'system-ui',
  }}>
    <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#111' }}>
      Sample Form
    </h3>
    <FormField label="Email" placeholder="you@example.com" type="email" />
    <FormField label="Password" placeholder="••••••••" type="password" />
    <LoginButton label="Sign In" />
  </div>
);

const App: React.FC = () => (
  <div style={{
    minHeight: '100vh', background: '#f8f9fa',
    padding: '40px 24px',
  }}>
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Logo */}
      <div style={{ marginBottom: 28 }}>
        <img src="/logo.png" alt="Optate" style={{ height: 32, display: 'block' }} />
      </div>
      <HeroCard />
      <StatsRow />
      <LoginForm />
    </div>
  </div>
);

// ── Mount the React app ─────────────────────────────────────────────────────
const root = document.getElementById('root')!;
createRoot(root).render(<App />);
