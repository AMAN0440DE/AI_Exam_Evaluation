import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { serverEndpoint } from "../config/appConfig";
import { usePermission } from "../rbac/userPermissions";

const loadRazorpay = () =>
    new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve(window.Razorpay);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
            if (window.Razorpay) resolve(window.Razorpay);
            else reject(new Error("Razorpay checkout could not be loaded."));
        };
        script.onerror = () =>
            reject(new Error("Unable to load Razorpay checkout."));
        document.body.appendChild(script);
    });

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(value || 0);

function GroupExpenses() {
    const { groupId } = useParams();
    const user = useSelector((state) => state.userDetails);
    const permissions = usePermission();
    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [savingExpense, setSavingExpense] = useState(false);
    const [savingSettlement, setSavingSettlement] = useState(false);
    const [savingPayment, setSavingPayment] = useState(false);
    const [updatingRole, setUpdatingRole] = useState("");
    const [error, setError] = useState("");
    const [paymentMessage, setPaymentMessage] = useState("");
    const [form, setForm] = useState({
        title: "",
        amount: "",
        paidBy: user?.email || "",
        splitType: "equal",
        participants: [],
        occurredAt: new Date().toISOString().slice(0, 10),
    });
    const [settlementForm, setSettlementForm] = useState({
        toEmail: "",
        amount: "",
        note: "",
    });

    const api = useMemo(
        () => ({ withCredentials: true }),
        []
    );
    const members =
        group?.members?.length > 0
            ? group.members
            : (group?.membersEmail || []).map((email) => ({
                  email,
                  role:
                      email.toLowerCase() === group?.adminEmail?.toLowerCase()
                          ? "admin"
                          : "user",
              }));
    const canManageExpenses =
        Boolean(group?.currentMemberRole) &&
        group.currentMemberRole !== "viewer";
    const canSettleGroupExpenses =
        permissions.canSettleGroupExpenses && canManageExpenses;
    const canAssignRoles =
        group?.currentMemberRole === "admin" &&
        (user?.role === "admin" ||
            group?.adminEmail?.toLowerCase() === user?.email?.toLowerCase());

    useEffect(() => {
        let active = true;
        const loadData = async () => {
            try {
                const groupResponse = await axios.get(
                    `${serverEndpoint}/groups/${groupId}`,
                    api
                );
                if (!active) return;
                const groupData = groupResponse.data.group;
                setGroup(groupData);
                const groupMembers = groupData.members?.length
                    ? groupData.members
                    : (groupData.membersEmail || []).map((email) => ({ email }));
                const memberEmails = new Set(
                    groupMembers.map(({ email }) => email.toLowerCase())
                );
                setForm((current) => ({
                    ...current,
                    paidBy: groupMembers.some(
                        (member) =>
                            member.email.toLowerCase() ===
                            current.paidBy?.toLowerCase()
                    )
                        ? current.paidBy
                        : groupMembers.find(
                              (member) =>
                                  member.email.toLowerCase() ===
                                  user?.email?.toLowerCase()
                          )?.email || groupMembers[0]?.email || "",
                    participants:
                        current.participants.some((participant) =>
                            memberEmails.has(participant.email.toLowerCase())
                        )
                            ? current.participants.filter((participant) =>
                                  memberEmails.has(
                                      participant.email.toLowerCase()
                                  )
                              )
                            : groupMembers.map(({ email }) => ({
                                  email: email.toLowerCase(),
                                  amount: "",
                                  shares: 1,
                              })),
                }));
                const results = await Promise.allSettled([
                    axios.get(
                        `${serverEndpoint}/groups/${groupId}/expenses?page=${page}&limit=10`,
                        api
                    ),
                    axios.get(
                        `${serverEndpoint}/groups/${groupId}/balances`,
                        api
                    ),
                    axios.get(
                        `${serverEndpoint}/groups/${groupId}/settlements?page=1&limit=10`,
                        api
                    ),
                ]);
                if (!active) return;
                const [expenseResult, balanceResult, settlementResult] = results;
                const failedSections = [];
                if (expenseResult.status === "fulfilled") {
                    setExpenses(expenseResult.value.data.expenses || []);
                    setTotalPages(
                        expenseResult.value.data.pagination?.totalPages || 1
                    );
                } else {
                    setExpenses([]);
                    setTotalPages(1);
                    failedSections.push("expense history");
                }
                if (balanceResult.status === "fulfilled") {
                    setBalances(balanceResult.value.data.balances || []);
                } else {
                    setBalances([]);
                    failedSections.push("group balances");
                }
                if (settlementResult.status === "fulfilled") {
                    setSettlements(
                        settlementResult.value.data.settlements || []
                    );
                } else {
                    setSettlements([]);
                    failedSections.push("settlements");
                }
                setError(
                    failedSections.length
                        ? `Unable to load ${failedSections.join(", ")}.`
                        : ""
                );
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.message ||
                            "Unable to load this group. Check your group membership and try again."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        loadData();
        return () => {
            active = false;
        };
    }, [api, groupId, page, refreshKey, user?.email]);

    const updateMemberRole = async (email, role) => {
        setUpdatingRole(email);
        setError("");
        try {
            const response = await axios.patch(
                `${serverEndpoint}/groups/members/role`,
                { groupId, email, role },
                api
            );
            setGroup((current) => ({
                ...response.data.group,
                members: (current?.members || []).map((member) =>
                    member.email === email
                        ? { ...member, role }
                        : member
                ),
            }));
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to update this member's role."
            );
        } finally {
            setUpdatingRole("");
        }
    };

    const toggleParticipant = (email) => {
        setForm((current) => {
            const selected = current.participants.some(
                (participant) => participant.email === email
            );
            return {
                ...current,
                participants: selected
                    ? current.participants.filter(
                          (participant) => participant.email !== email
                      )
                    : [
                          ...current.participants,
                          { email, amount: "", shares: 1 },
                      ],
            };
        });
    };

    const updateParticipant = (email, key, value) => {
        setForm((current) => ({
            ...current,
            participants: current.participants.map((participant) =>
                participant.email === email
                    ? { ...participant, [key]: value }
                    : participant
            ),
        }));
    };

    const submitExpense = async (event) => {
        event.preventDefault();
        setSavingExpense(true);
        setError("");
        try {
            const participants = form.participants.map((participant) => ({
                email: participant.email,
                ...(form.splitType === "exact"
                    ? { amount: Number(participant.amount) }
                    : {}),
                ...(form.splitType === "shares"
                    ? { shares: Number(participant.shares) }
                    : {}),
            }));
            await axios.post(
                `${serverEndpoint}/groups/${groupId}/expenses`,
                {
                    ...form,
                    amount: Number(form.amount),
                    participants,
                },
                api
            );
            setForm((current) => ({
                ...current,
                title: "",
                amount: "",
            }));
            setPage(1);
            setRefreshKey((value) => value + 1);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to add this expense."
            );
        } finally {
            setSavingExpense(false);
        }
    };

    const currentBalance =
        balances.find(
            (balance) =>
                balance.email.toLowerCase() === user?.email?.toLowerCase()
        )?.balance || 0;
    const creditors = balances.filter((balance) => balance.balance > 0.005);
    const availableToSettle = Math.max(0, -currentBalance);

    const submitSettlement = async (event) => {
        event.preventDefault();
        setSavingSettlement(true);
        setError("");
        try {
            await axios.post(
                `${serverEndpoint}/groups/${groupId}/settlements`,
                {
                    toEmail: settlementForm.toEmail,
                    amount: Number(settlementForm.amount),
                    note: settlementForm.note,
                },
                api
            );
            setSettlementForm({ toEmail: "", amount: "", note: "" });
            setRefreshKey((value) => value + 1);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Unable to record this settlement."
            );
        } finally {
            setSavingSettlement(false);
        }
    };

    const startRazorpayPayment = async () => {
        setSavingPayment(true);
        setError("");
        setPaymentMessage("");
        try {
            const orderResponse = await axios.post(
                `${serverEndpoint}/groups/${groupId}/settlements/payment/order`,
                {
                    toEmail: settlementForm.toEmail,
                    amount: Number(settlementForm.amount),
                },
                api
            );
            const Razorpay = await loadRazorpay();
            const checkout = new Razorpay({
                key: orderResponse.data.keyId,
                amount: orderResponse.data.amount,
                currency: orderResponse.data.currency,
                name: "MergeMoney",
                description: `Settle up · ${orderResponse.data.groupName}`,
                order_id: orderResponse.data.orderId,
                prefill: {
                    name: orderResponse.data.payerName,
                    email: orderResponse.data.payerEmail,
                },
                notes: {
                    group: orderResponse.data.groupName,
                    recipient: settlementForm.toEmail,
                    note: settlementForm.note,
                },
                theme: { color: "#0d6efd" },
                handler: async (paymentResponse) => {
                    try {
                        await axios.post(
                            `${serverEndpoint}/groups/${groupId}/settlements/payment/verify`,
                            {
                                ...paymentResponse,
                                note: settlementForm.note,
                            },
                            api
                        );
                        setSettlementForm({
                            toEmail: "",
                            amount: "",
                            note: "",
                        });
                        setPaymentMessage("Payment complete. Your group balance is updated.");
                        setRefreshKey((value) => value + 1);
                    } catch (requestError) {
                        setError(
                            `Checkout returned, but settlement verification could not be completed. If your bank shows a debit, contact the group admin. ${
                                requestError.response?.data?.message ||
                                requestError.message
                            }`
                        );
                    } finally {
                        setSavingPayment(false);
                    }
                },
                modal: {
                    ondismiss: () => setSavingPayment(false),
                },
            });
            checkout.on("payment.failed", (paymentError) => {
                setError(
                    paymentError.error?.description ||
                        "Payment did not complete. Please try again."
                );
                setSavingPayment(false);
            });
            checkout.open();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    requestError.message ||
                    "Unable to start this payment."
            );
            setSavingPayment(false);
        }
    };

    if (loading && !group) {
        return (
            <div className="container py-5 text-center" role="status">
                Loading group expenses…
            </div>
        );
    }

    return (
        <main className="container py-4 py-lg-5">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <Link to="/groups">Groups</Link>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        {group?.name || "Group expenses"}
                    </li>
                </ol>
            </nav>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            {paymentMessage && (
                <div className="alert alert-success" role="status">
                    {paymentMessage}
                </div>
            )}

            <section className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                        <div>
                            <span className="badge text-bg-primary mb-2">
                                Group expense manager
                            </span>
                            <h1 className="h2 fw-bold mb-2">{group?.name}</h1>
                            <p className="text-muted mb-3">
                                {group?.description || "Shared expenses and member balances"}
                            </p>
                        </div>
                        <div className="text-md-end">
                            <div className="small text-muted">Your group balance</div>
                            <div
                                className={`h3 fw-bold ${
                                    currentBalance > 0
                                        ? "text-success"
                                        : currentBalance < 0
                                          ? "text-danger"
                                          : "text-dark"
                                }`}
                            >
                                {money(currentBalance)}
                            </div>
                            <div className="small text-muted">
                                {currentBalance > 0
                                    ? "Others owe you"
                                    : currentBalance < 0
                                      ? "You owe the group"
                                      : "All settled"}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body p-4">
                    <h2 className="h5 fw-bold mb-3">Group members and roles</h2>
                    <div className="row g-2">
                        {members.map((member) => (
                            <div
                                className="col-md-6 col-lg-4"
                                key={member.email}
                            >
                                <div className="d-flex align-items-center justify-content-between gap-2 border rounded-3 p-2">
                                    <span className="small text-break">
                                        {member.name
                                            ? `${member.name} (${member.email})`
                                            : member.email}
                                    </span>
                                    {canAssignRoles &&
                                    member.role !== "admin" ? (
                                        <select
                                            className="form-select form-select-sm"
                                            aria-label={`Role for ${member.email}`}
                                            value={member.role}
                                            disabled={updatingRole === member.email}
                                            onChange={(event) =>
                                                updateMemberRole(
                                                    member.email,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    ) : (
                                        <span className="badge text-bg-light border">
                                            {member.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && (
                            <p className="text-muted mb-0">
                                No group members are assigned yet.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <div className="row g-4 align-items-start">
                <div className="col-lg-7">
                    <section className="card border-0 shadow-sm rounded-4 mb-4">
                        <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Group balances</h2>
                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th className="text-end">Net balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {balances.map((balance) => (
                                            <tr key={balance.email}>
                                                <td>{balance.email}</td>
                                                <td
                                                    className={`text-end fw-semibold ${
                                                        balance.balance > 0
                                                            ? "text-success"
                                                            : balance.balance < 0
                                                              ? "text-danger"
                                                              : ""
                                                    }`}
                                                >
                                                    {money(balance.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-4 mb-4">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="h5 fw-bold mb-0">Expense history</h2>
                                <span className="small text-muted">
                                    Page {page} of {totalPages}
                                </span>
                            </div>
                            {expenses.length === 0 ? (
                                <p className="text-muted mb-0">
                                    No expenses yet. Add the first group expense.
                                </p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>Expense</th>
                                                <th>Paid by</th>
                                                <th>Split</th>
                                                <th className="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((expense) => (
                                                <tr key={expense._id}>
                                                    <td>
                                                        <div className="fw-semibold">
                                                            {expense.title}
                                                        </div>
                                                        <small className="text-muted">
                                                            {new Date(
                                                                expense.occurredAt
                                                            ).toLocaleDateString()}
                                                        </small>
                                                    </td>
                                                    <td>{expense.paidBy}</td>
                                                    <td>
                                                        <span className="badge text-bg-light">
                                                            {expense.splitType}
                                                        </span>
                                                        <div className="small text-muted">
                                                            {expense.shares.length} members
                                                        </div>
                                                    </td>
                                                    <td className="text-end fw-semibold">
                                                        {money(expense.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between">
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        disabled={page <= 1}
                                        onClick={() => setPage((value) => value - 1)}
                                    >
                                        Previous
                                    </button>
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

                    <section className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Recent settlements</h2>
                            {settlements.length === 0 ? (
                                <p className="text-muted mb-0">
                                    Settlements will appear here.
                                </p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {settlements.map((settlement) => (
                                        <li
                                            className="list-group-item px-0 d-flex justify-content-between gap-3"
                                            key={settlement._id}
                                        >
                                            <span>
                                                <strong>{settlement.fromEmail}</strong>
                                                {" paid "}
                                                <strong>{settlement.toEmail}</strong>
                                                {settlement.note
                                                    ? ` · ${settlement.note}`
                                                    : ""}
                                            </span>
                                            <strong>{money(settlement.amount)}</strong>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>

                <div className="col-lg-5">
                    {canManageExpenses && (
                        <section className="card border-0 shadow-sm rounded-4 mb-4">
                            <div className="card-body p-4">
                                <h2 className="h5 fw-bold mb-3">Add an expense</h2>
                                <form onSubmit={submitExpense}>
                                    <label className="form-label" htmlFor="expense-title">
                                        Title
                                    </label>
                                    <input
                                        id="expense-title"
                                        className="form-control mb-3"
                                        value={form.title}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                title: event.target.value,
                                            })
                                        }
                                        maxLength={120}
                                        required
                                    />
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <label className="form-label" htmlFor="expense-amount">
                                                Amount (INR)
                                            </label>
                                            <input
                                                id="expense-amount"
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
                                        </div>
                                        <div className="col-sm-6">
                                            <label className="form-label" htmlFor="expense-date">
                                                Date
                                            </label>
                                            <input
                                                id="expense-date"
                                                className="form-control mb-3"
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
                                        </div>
                                    </div>
                                    <label className="form-label" htmlFor="expense-payer">
                                        Paid by
                                    </label>
                                    <select
                                        id="expense-payer"
                                        className="form-select mb-3"
                                        value={form.paidBy}
                                        required
                                        disabled={members.length === 0}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                paidBy: event.target.value,
                                            })
                                        }
                                    >
                                        {members.length === 0 && (
                                            <option value="">
                                                No group members available
                                            </option>
                                        )}
                                        {members.map((member) => (
                                            <option
                                                key={member.email}
                                                value={member.email}
                                            >
                                                {member.name
                                                    ? `${member.name} (${member.email})`
                                                    : member.email}
                                            </option>
                                        ))}
                                    </select>
                                    <label className="form-label" htmlFor="split-type">
                                        Split method
                                    </label>
                                    <select
                                        id="split-type"
                                        className="form-select mb-3"
                                        value={form.splitType}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                splitType: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="equal">Equal split</option>
                                        <option value="exact">Custom amounts</option>
                                        <option value="shares">Weighted shares</option>
                                    </select>
                                    <div className="mb-3">
                                        <span className="form-label d-block">
                                            Split between
                                        </span>
                                        {members.map(({ email }) => {
                                            const participant =
                                                form.participants.find(
                                                    (entry) => entry.email === email
                                                );
                                            return (
                                                <div
                                                    className="border rounded-3 p-2 mb-2"
                                                    key={email}
                                                >
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`member-${email}`}
                                                            checked={Boolean(participant)}
                                                            onChange={() =>
                                                                toggleParticipant(email)
                                                            }
                                                        />
                                                        <label
                                                            className="form-check-label small"
                                                            htmlFor={`member-${email}`}
                                                        >
                                                            {email}
                                                        </label>
                                                    </div>
                                                    {participant &&
                                                        form.splitType !== "equal" && (
                                                            <input
                                                                className="form-control form-control-sm mt-2"
                                                                type="number"
                                                                min={
                                                                    form.splitType ===
                                                                    "shares"
                                                                        ? "0.01"
                                                                        : "0"
                                                                }
                                                                step={
                                                                    form.splitType ===
                                                                    "shares"
                                                                        ? "0.01"
                                                                        : "0.01"
                                                                }
                                                                placeholder={
                                                                    form.splitType ===
                                                                    "exact"
                                                                        ? "Amount"
                                                                        : "Share weight"
                                                                }
                                                                value={
                                                                    form.splitType ===
                                                                    "exact"
                                                                        ? participant.amount
                                                                        : participant.shares
                                                                }
                                                                onChange={(event) =>
                                                                    updateParticipant(
                                                                        email,
                                                                        form.splitType ===
                                                                            "exact"
                                                                            ? "amount"
                                                                            : "shares",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                required
                                                            />
                                                        )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className="btn btn-primary w-100"
                                        disabled={
                                            savingExpense ||
                                            form.participants.length === 0
                                        }
                                    >
                                        {savingExpense ? "Saving…" : "Save expense"}
                                    </button>
                                </form>
                            </div>
                        </section>
                    )}

                    {canSettleGroupExpenses &&
                        currentBalance < -0.005 &&
                        creditors.length > 0 && (
                            <section className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 fw-bold mb-2">
                                        Record a settlement
                                    </h2>
                                    <p className="small text-muted">
                                        You owe up to {money(availableToSettle)}.
                                    </p>
                                    <form onSubmit={submitSettlement}>
                                        <label className="form-label" htmlFor="settlement-to">
                                            Pay to
                                        </label>
                                        <select
                                            id="settlement-to"
                                            className="form-select mb-3"
                                            value={settlementForm.toEmail}
                                            onChange={(event) => {
                                                const creditor = creditors.find(
                                                    (entry) =>
                                                        entry.email === event.target.value
                                                );
                                                setSettlementForm({
                                                    ...settlementForm,
                                                    toEmail: event.target.value,
                                                    amount: creditor
                                                        ? Math.min(
                                                              availableToSettle,
                                                              creditor.balance
                                                          ).toFixed(2)
                                                        : "",
                                                });
                                            }}
                                            required
                                        >
                                            <option value="">Select a member</option>
                                            {creditors.map((creditor) => (
                                                <option
                                                    key={creditor.email}
                                                    value={creditor.email}
                                                >
                                                    {creditor.email} · owed{" "}
                                                    {money(creditor.balance)}
                                                </option>
                                            ))}
                                        </select>
                                        <label
                                            className="form-label"
                                            htmlFor="settlement-amount"
                                        >
                                            Amount (INR)
                                        </label>
                                        <input
                                            id="settlement-amount"
                                            className="form-control mb-3"
                                            type="number"
                                            min="0.01"
                                            max={
                                                settlementForm.toEmail
                                                    ? Math.min(
                                                          availableToSettle,
                                                          creditors.find(
                                                              (entry) =>
                                                                  entry.email ===
                                                                  settlementForm.toEmail
                                                          )?.balance || 0
                                                      )
                                                    : availableToSettle
                                            }
                                            step="0.01"
                                            value={settlementForm.amount}
                                            onChange={(event) =>
                                                setSettlementForm({
                                                    ...settlementForm,
                                                    amount: event.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <label
                                            className="form-label"
                                            htmlFor="settlement-note"
                                        >
                                            Note (optional)
                                        </label>
                                        <input
                                            id="settlement-note"
                                            className="form-control mb-3"
                                            maxLength={250}
                                            value={settlementForm.note}
                                            onChange={(event) =>
                                                setSettlementForm({
                                                    ...settlementForm,
                                                    note: event.target.value,
                                                })
                                            }
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-outline-secondary w-100 mb-2"
                                            disabled={savingSettlement}
                                        >
                                            {savingSettlement
                                                ? "Recording…"
                                                : "Record settlement manually"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary w-100"
                                            onClick={startRazorpayPayment}
                                            disabled={
                                                savingPayment ||
                                                !settlementForm.toEmail ||
                                                Number(settlementForm.amount) < 1
                                            }
                                        >
                                            {savingPayment
                                                ? "Opening secure checkout…"
                                                : `Pay ${settlementForm.amount ? money(Number(settlementForm.amount)) : "with Razorpay"}`}
                                        </button>
                                    </form>
                                </div>
                            </section>
                        )}
                </div>
            </div>
        </main>
    );
}

export default GroupExpenses;
