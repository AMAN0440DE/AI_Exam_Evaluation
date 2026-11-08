import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import { serverEndpoint } from "../config/appConfig";
import { useSelector } from "react-redux";

function GroupCard({ group, onUpdate }) {
    const user = useSelector((state) => state.userDetails);
    const [showMembers, setShowMembers] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [memberRole, setMemberRole] = useState("user");
    const [errors, setErrors] = useState({});

    const handleShowMember = () => setShowMembers(!showMembers);
    const canManageMembers =
        group.currentMemberRole === "admin" ||
        group.currentMemberRole === "manager" ||
        user?.role === "admin";
    const canAssignRoles =
        group.currentMemberRole === "admin" ||
        (user?.role === "admin" &&
            group.adminEmail?.toLowerCase() !== user?.email?.toLowerCase());

    const handleAddMember = async () => {
        if (memberEmail.length === 0) return;

        try {
            const response = await axios.patch(
                `${serverEndpoint}/groups/members/add`,
                {
                    groupId: group._id,
                    emails: [memberEmail],
                    role: canAssignRoles ? memberRole : "user",
                },
                { withCredentials: true }
            );
            setMemberEmail("");
            setMemberRole("user");
            setErrors({});
            onUpdate(response.data);
        } catch (error) {
            console.log(error);
            setErrors({
                message:
                    error.response?.data?.message || "Unable to add member",
            });
        }
    };

    return (
        <div className="card h-100 border-0 shadow-sm rounded-4 transition-hover">
            <div className="card-body p-4 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary mb-2">
                        <i className="bi bi-collection-fill fs-4"></i>
                    </div>
                    {group.adminEmail && (
                        <span className="badge rounded-pill bg-light text-dark border fw-normal small">
                            Admin: {group.adminEmail.split("@")[0]}
                        </span>
                    )}
                </div>

                <h5 className="fw-bold mb-1 text-dark text-truncate">
                    {group.name}
                </h5>

                <button
                    className="btn btn-sm text-primary p-0 text-start fw-medium mb-3"
                    onClick={handleShowMember}
                >
                    <i className={`bi bi-people-fill me-1`}></i>
                    {(group.members || group.membersEmail || []).length} Members{" "}
                    {showMembers ? "▴" : "▾"}
                </button>

                <p className="text-muted small mb-3 flex-grow-1">
                    {group.description || "No description provided."}
                </p>

                <Link
                    to={`/groups/${group._id}`}
                    className="btn btn-outline-primary btn-sm rounded-pill fw-bold mb-4 w-100 py-2"
                >
                    View & Add Expenses
                </Link>

                {showMembers && (
                    <div className="bg-light rounded-3 p-3 mb-4 border-0 shadow-inner">
                        <h6 className="extra-small fw-bold text-uppercase text-secondary mb-3">
                            Member List
                        </h6>
                        <div
                            className="overflow-auto"
                            style={{ maxHeight: "150px" }}
                        >
                            {(group.members || group.membersEmail || []).map((member, index) => {
                                const email =
                                    typeof member === "string"
                                        ? member
                                        : member.email;
                                const role =
                                    typeof member === "string"
                                        ? "user"
                                        : member.role;
                                return (
                                <div
                                    key={email || index}
                                    className="d-flex align-items-center mb-2 last-child-mb-0"
                                >
                                    <div
                                        className="rounded-circle bg-white border d-flex align-items-center justify-content-center me-2 fw-bold text-primary shadow-sm"
                                        style={{
                                            width: "24px",
                                            height: "24px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        {email?.charAt(0).toUpperCase()}
                                    </div>
                                    <span
                                        className="small text-dark text-truncate"
                                        title={email}
                                    >
                                        {email}
                                    </span>
                                    <span className="badge text-bg-light border ms-auto">
                                        {role}
                                    </span>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {errors.message && (
                    <div className="alert alert-danger py-1 px-2 small border-0 mb-3">
                        {errors.message}
                    </div>
                )}

                {canManageMembers && (
                    <div className="mt-auto pt-3 border-top">
                        <label className="form-label extra-small fw-bold text-uppercase text-muted mb-2">
                            Invite a Friend
                        </label>
                        <div className="input-group input-group-sm">
                            <input
                                type="email"
                                className="form-control bg-light border-0 px-3"
                                placeholder="email@example.com"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                            />
                            {canAssignRoles && (
                                <select
                                    className="form-select"
                                    aria-label="Role for invited member"
                                    value={memberRole}
                                    onChange={(event) =>
                                        setMemberRole(event.target.value)
                                    }
                                >
                                    <option value="user">User</option>
                                    <option value="manager">Manager</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            )}
                            <button
                                className="btn btn-primary px-3 fw-bold"
                                onClick={handleAddMember}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GroupCard;
