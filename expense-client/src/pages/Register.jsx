import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { serverEndpoint } from "../config/appConfig";

function Register() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [registered, setRegistered] = useState(false);

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            await axios.post(`${serverEndpoint}/auth/register`, {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
            });
            setRegistered(true);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to create your account. Please try again."
            );
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow-lg border-0 rounded-4">
                        <div className="card-body p-5">
                            <div className="text-center mb-4">
                                <h2 className="fw-bold text-dark">
                                    Create your account
                                </h2>
                                <p className="text-muted">
                                    Start managing your money with MergeMoney.
                                </p>
                            </div>

                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}

                            {registered ? (
                                <div className="text-center">
                                    <div
                                        className="alert alert-success"
                                        role="status"
                                    >
                                        Your account was created successfully.
                                        Sign in to continue.
                                    </div>
                                    <Link
                                        to="/login"
                                        className="btn btn-primary w-100 rounded-pill fw-bold"
                                    >
                                        Go to Sign In
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label
                                            className="form-label small fw-bold text-secondary"
                                            htmlFor="register-name"
                                        >
                                            Full Name
                                        </label>
                                        <input
                                            id="register-name"
                                            className="form-control form-control-lg rounded-3 fs-6"
                                            type="text"
                                            name="name"
                                            autoComplete="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label
                                            className="form-label small fw-bold text-secondary"
                                            htmlFor="register-email"
                                        >
                                            Email Address
                                        </label>
                                        <input
                                            id="register-email"
                                            className="form-control form-control-lg rounded-3 fs-6"
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label
                                            className="form-label small fw-bold text-secondary"
                                            htmlFor="register-password"
                                        >
                                            Password
                                        </label>
                                        <input
                                            id="register-password"
                                            className="form-control form-control-lg rounded-3 fs-6"
                                            type="password"
                                            name="password"
                                            autoComplete="new-password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            minLength={8}
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label
                                            className="form-label small fw-bold text-secondary"
                                            htmlFor="register-confirm-password"
                                        >
                                            Confirm Password
                                        </label>
                                        <input
                                            id="register-confirm-password"
                                            className="form-control form-control-lg rounded-3 fs-6"
                                            type="password"
                                            name="confirmPassword"
                                            autoComplete="new-password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <button className="btn btn-primary w-100 rounded-pill fw-bold shadow-sm">
                                        Create Account
                                    </button>
                                </form>
                            )}

                            {!registered && (
                                <p className="text-center text-muted mt-4 mb-0">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="fw-bold text-decoration-none"
                                    >
                                        Sign in
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
