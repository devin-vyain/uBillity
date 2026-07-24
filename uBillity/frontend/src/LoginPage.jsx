import { useState } from 'react';
import { useAuth } from './context/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
        } catch (err) {
            setError('Invalid username or password.');
        }
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100vh', width: '100vw' }}
        >
            <form onSubmit={handleSubmit} className="p-4 border rounded shadow-sm" style={{ width: '320px' }}>
                <h3 className="mb-4 text-center">uBillity Login</h3>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                    Log in
                </button>
            </form>
        </div>
    );
}