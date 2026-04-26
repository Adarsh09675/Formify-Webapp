import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import FormBuilder from './FormBuilder';
import FormDetails from './FormDetails';

const API_BASE = 'http://localhost:5000';

function Login({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    const nextRegister = !isRegister;
    setIsRegister(nextRegister);
    setErr('');
    if (nextRegister) {
      setUsername('');
      setPassword('');
    } else {
      setUsername('admin');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('formify_token', data.token);
      setToken(data.token);
    } catch(e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center">
      <div className="panel" style={{ width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent)', marginBottom: '2rem' }}>
          {isRegister ? 'Create Account' : 'Formify Login'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {err && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '14px' }}>{err}</div>}
          <button style={{ width: '100%', marginBottom: '1rem' }} disabled={loading}>
            {loading ? <span className="loader" /> : (isRegister ? 'Register' : 'Log In')}
          </button>
        </form>
        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span 
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            onClick={toggleMode}
          >
            {isRegister ? 'Log in' : 'Register here'}
          </span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('formify_token'));

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <BrowserRouter>
      <div className="container">
        <nav>
          <a href="/" style={{textDecoration:'none'}}><h1>Formify.</h1></a>
          <button className="secondary" onClick={() => {
            localStorage.removeItem('formify_token');
            setToken(null);
          }}>Log Out</button>
        </nav>
        
        <Routes>
          <Route path="/" element={<Dashboard apiBase={API_BASE} token={token} />} />
          <Route path="/build" element={<FormBuilder apiBase={API_BASE} token={token} />} />
          <Route path="/edit/:id" element={<FormBuilder apiBase={API_BASE} token={token} />} />
          <Route path="/form/:id" element={<FormDetails apiBase={API_BASE} token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
