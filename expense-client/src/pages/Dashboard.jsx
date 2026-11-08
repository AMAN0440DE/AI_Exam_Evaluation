import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { serverEndpoint } from "../config/appConfig";

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(value || 0);

function Dashboard() {
    const user = useSelector((state) => state.userDetails);
    const canManageTransactions = user?.role !== "viewer";
    const [summary, setSummary] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
        incomeCount: 0,
        expenseCount: 0,
    });
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [form, setForm] = useState({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        occurredAt: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        let active = true;
        const loadFinance = async () => {
            try {
                const [summaryResponse, transactionResponse] =
                    await Promise.all([
                        axios.get(
                            `${serverEndpoint}/personal-finance/summary`,
                            { withCredentials: true }
                        ),
                        axios.get(
                            `${serverEndpoint}/personal-finance/transactions?page=${page}&limit=10`,
                            { withCredentials: true }
                        ),
                    ]);
                if (active) {
                    setSummary(summaryResponse.data);
                    setTransactions(
                        transactionResponse.data.transactions || []
                    );
                    setTotalPages(
                        transactionResponse.data.pagination?.totalPages || 1
                    );
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.message ||
                            "Unable to load your finances."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        loadFinance();
        return () => {
            active = false;
        };
    }, [page, refreshKey]);

    const submitTransaction = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await axios.post(
                `${serverEndpoint}/personal-finance/transactions`,
                { ...form, amount: Number(form.amount) },
                { withCredentials: true }
            );
            setForm((current) => ({
                ...current,
                amount: "",
                category: "",
                description: "",
            }));
            setPage(1);
            setRefreshKey((value) => value + 1);
            setSuccess("Transaction saved.");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to save this transaction."
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteTransaction = async (transactionId) => {
        setError("");
        setSuccess("");
        try {
            await axios.delete(
                `${serverEndpoint}/personal-finance/transactions/${transactionId}`,
                { withCredentials: true }
            );
            setSuccess("Transaction deleted.");
            setRefreshKey((value) => value + 1);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to delete this transaction."
            );
        }
    };

    return (
        <main className="container py-4 py-lg-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
                <div>
                    <span className="badge text-bg-primary mb-2">
                        Personal finance
                    </span>
                    <h1 className="display-6 fw-bold mb-1">Money overview</h1>
                    <p className="text-muted mb-0">
                        Personal transactions include your share of group expenses.
                    </p>
                </div>
                <Link to="/groups" className="btn btn-outline-primary">
                    <i className="bi bi-people me-2" aria-hidden="true"></i>
                    Go to groups
                </Link>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            {success && (
                <div className="alert alert-success" role="status">
                    {success}
                </div>
            )}

            <div className="row g-3 mb-4">
                {[
                    {
                        label: "Total income",
                        value: summary.income,
                        color: "success",
                        icon: "bi-arrow-down-left-circle",
                    },
                    {
                        label: "Total expenses",
                        value: summary.expenses,
                        color: "danger",
                        icon: "bi-arrow-up-right-circle",
                    },
                    {
                        label: "Net balance",
                        value: summary.balance,
                        color: summary.balance >= 0 ? "primary" : "warning",
                        icon: "bi-wallet2",
                    },
                ].map((item) => (
                    <div className="col-md-4" key={item.label}>
                        <section className="card h-100 border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">{item.label}</span>
                                    <i
                                        className={`bi ${item.icon} text-${item.color} fs-4`}
                                        aria-hidden="true"
                                    ></i>
                                </div>
                                <div className={`h3 fw-bold text-${item.color} mb-0 mt-2`}>
                                    {money(item.value)}
                                </div>
                            </div>
                        </section>
                    </div>
                ))}
            </div>

            <div className="row g-4 align-items-start">
                <div className={canManageTransactions ? "col-lg-7" : "col-12"}>
                    <section className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                <h2 className="h5 fw-bold mb-0">Transactions</h2>
                                <span className="small text-muted">
                                    {summary.incomeCount} income · {summary.expenseCount} expenses
                                </span>
                            </div>
                            {loading ? (
                                <p className="text-muted" role="status">
                                    Loading transactions…
                                </p>
                            ) : transactions.length === 0 ? (
                                <p className="text-muted mb-0">
                                    No transactions yet. Add income or an expense to get started.
                                </p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>Transaction</th>
                                                <th>Category</th>
                                                <th>Date</th>
                                                <th className="text-end">Amount</th>
                                                {canManageTransactions && (
                                                    <th aria-label="Actions"></th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction) => (
                                                <tr key={transaction._id}>
                                                    <td>
                                                        <div className="fw-semibold">
                                                            {transaction.description ||
                                                                transaction.category}
                                                        </div>
                                                        {transaction.sourceGroupId && (
                                                            <small className="text-muted">
                                                                Shared group expense
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td>{transaction.category}</td>
                                                    <td>
                                                        {new Date(
                                                            transaction.occurredAt
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td
                                                        className={`text-end fw-semibold ${
                                                            transaction.type === "income"
                                                                ? "text-success"
                                                                : "text-dark"
                                                        }`}
                                                    >
                                                        {transaction.type === "income"
                                                            ? "+"
                                                            : "−"}
                                                        {money(transaction.amount)}
                                                    </td>
                                                    {canManageTransactions && (
                                                        <td className="text-end">
                                                            {!transaction.sourceExpenseId && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    aria-label={`Delete ${transaction.description || transaction.category}`}
                                                                    onClick={() =>
                                                                        deleteTransaction(
                                                                            transaction._id
                                                                        )
                                                                    }
                                                                >
                                                                    <i
                                                                        className="bi bi-trash"
                                                                        aria-hidden="true"
                                                                    ></i>
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center">
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        disabled={page <= 1}
                                        onClick={() => setPage((value) => value - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span className="small text-muted">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((value) => value + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {canManageTransactions && (
                    <div className="col-lg-5">
                        <section className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h2 className="h5 fw-bold mb-3">Add transaction</h2>
                                <form onSubmit={submitTransaction}>
                                    <label className="form-label" htmlFor="transaction-type">
                                        Type
                                    </label>
                                    <select
                                        id="transaction-type"
                                        className="form-select mb-3"
                                        value={form.type}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                type: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                    </select>
                                    <label className="form-label" htmlFor="transaction-amount">
                                        Amount (INR)
                                    </label>
                                    <input
                                        id="transaction-amount"
                                        className="form-control mb-3"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                amount: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <label className="form-label" htmlFor="transaction-category">
                                        Category
                                    </label>
                                    <input
                                        id="transaction-category"
                                        className="form-control mb-3"
                                        placeholder="e.g. Groceries, Salary"
                                        maxLength={60}
                                        value={form.category}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                category: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <label className="form-label" htmlFor="transaction-description">
                                        Description
                                    </label>
                                    <input
                                        id="transaction-description"
                                        className="form-control mb-3"
                                        maxLength={250}
                                        value={form.description}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                description: event.target.value,
                                            })
                                        }
                                    />
                                    <label className="form-label" htmlFor="transaction-date">
                                        Date
                                    </label>
                                    <input
                                        id="transaction-date"
                                        className="form-control mb-4"
                                        type="date"
                                        value={form.occurredAt}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                occurredAt: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <button
                                        className="btn btn-primary w-100"
                                        disabled={saving}
                                    >
                                        {saving ? "Saving…" : "Save transaction"}
                                    </button>
                                </form>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

export default Dashboard;
