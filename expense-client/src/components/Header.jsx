import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeContext";

function Header() {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top border-bottom shadow-sm">
            <div className="container py-2">
                <Link className="navbar-brand d-flex align-items-center fw-bold fs-3 text-dark" to="/">
                    <span className="text-primary">Merge</span>Money
                </Link>

                <button
                    className="navbar-toggler border-0"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon" />
                </button>

                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
                        <li className="nav-item me-lg-2">
                            <ThemeToggle />
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link fw-medium px-3 text-dark" aria-current="page" to="/">
                                Home
                            </Link>
                        </li>
                        <li className="nav-item ms-lg-3 mt-2 mt-lg-0">
                            <Link className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" to="/login">
                                Get Started
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Header;