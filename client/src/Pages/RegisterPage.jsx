import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const Register = () => {

    const [email, setEmail] = useState('');
    const [fullname, setFullname] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [errors, setErrors] = useState('');

    const navigate = useNavigate();

    const isValid = () => {
        if (!email || !fullname || !password || !repeatPassword) {
            setErrors('All fields must be filled.');
            return false;
        }

        if (!email.includes('@') || email.endsWith('.com')) {
            setErrors('Email must contain "@" and must not end with ".com".');
            return false;
        }

        if (password !== repeatPassword) {
            setErrors('Passwords do not match.');
            return false;
        }

        setErrors('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValid()) return;

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, fullname, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Registration successful:', data.message);
                navigate('/login');
            } else {
                setErrors(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            setErrors('Server error during registration.');
        }
    };

    return (
        <div className="login-page-wrapper">
        <div className="login-page-container">
            <h2>
                <span className="brand-name">Student Trade</span>
            </h2>
            <form className="login-form" onSubmit={handleSubmit}>

                <div className="form-group">
                    <label htmlFor="email">Email address:</label>
                    <input
                        type="text"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="fullname">Full name:</label>
                    <input
                        type="text"
                        id="fullname"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="repeatPassword">Repeat Password:</label>
                    <input
                        type="password"
                        id="repeatPassword"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        required
                    />
                </div>

                {errors && <p className="error-msg">{errors}</p>}

                <button type="submit" disabled={!email || !fullname || !password || !repeatPassword}>
                    Register
                </button>
            </form>

            <p className="register-link">
                Already have an account? <a href="/login">Login here</a>
            </p>
        </div>
        </div>
    );
}

export default Register;