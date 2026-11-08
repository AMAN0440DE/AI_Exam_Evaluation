import { useEffect, useState } from "react";
import axios from "axios";
import { serverEndpoint } from "../config/appConfig";
import Can from '../components/Can'
import { usePermission } from "../rbac/userPermissions";

function ManageUsers() {
  const permissions = usePermission();
  const [users, setUsers] = useState([]);
  const [message, setMessage]= useState(null);
  const [errors, setErrors] = useState({});
  const [actionLoading, setActionLoading]= useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "user" });
  const [formData, setFormData]=useState({
    name: "",
    email: "",
    role: "Select"
  });

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${serverEndpoint}/users`, {
          withCredentials: true,
        });
        if (active) setUsers(response.data.users || []);
      } catch (error) {
        console.error(error);
        if (active) {
          setErrors({ message: "Unable to fetch users, please try again" });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchUsers();
    return () => {
      active = false;
    };
  }, []);

  const handleChange=(e)=>{
    const name= e.target.name;
    const value=e.target.value;
    setFormData({
        ...formData,
        [name] : value,
    });
  };

  const validate=()=>{
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if(formData.role === "Select") newErrors.role = "Role is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e)=>{
    e.preventDefault();
    if(validate()){
        setActionLoading(true);
        try{
            const response=await axios.post(`${serverEndpoint}/users/`,
                {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                },
                {withCredentials: true}
            );
            setUsers([...users, response.data.user]);
            setMessage("User added!");
            setFormData({ name: "", email: "", role: "Select" });
        }
        catch(error){
            console.log(error);
            setErrors({message: "Unable to add user, please try again"})
        }
        finally{
            setActionLoading(false);
        }
    }
  };

  const startEditing = (user) => {
    setEditingUserId(user._id);
    setEditForm({ name: user.name, role: user.role });
    setErrors({});
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setErrors({});
  };

  const handleUpdate = async (userId) => {
    if (!editForm.name.trim()) {
      setErrors({ message: "Name is required" });
      return;
    }

    setActionLoading(true);
    setErrors({});
    try {
      const response = await axios.patch(
        `${serverEndpoint}/users/`,
        { userId, name: editForm.name.trim(), role: editForm.role },
        { withCredentials: true }
      );
      setUsers(users.map((user) =>
        user._id === userId ? response.data.user : user
      ));
      setEditingUserId(null);
      setMessage("User updated!");
    } catch (error) {
      console.error(error);
      setErrors({ message: "Unable to update user, please try again" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    setActionLoading(true);
    setErrors({});
    try {
      await axios.post(
        `${serverEndpoint}/users/delete`,
        { userId },
        { withCredentials: true }
      );
      setUsers(users.filter((user) => user._id !== userId));
      setMessage("User deleted!");
    } catch (error) {
      console.error(error);
      setErrors({ message: "Unable to delete user, please try again" });
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="container p-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 px-4 px-md-5">
      <div className="row align-items-center mb-5">
        <div className="col-md-8 text-center text-md-start">
          <h2 className="fw-bold display-6">
            Manage <span className="text-primary">Users</span>
          </h2>
          <p className="text-muted mb-0">
            View and manage all the users along with their permissions
          </p>
        </div>
      </div>
      
      {errors.message && (
        <div className="alert alert-danger" role="alert">
          {errors.message}
        </div>
      )}  

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}  
      
      <div className="row">
        {/* Add user form (future) */}
        <Can requiredPermission="canCreateUsers">
        <div className="col-md-3">
            <div className="card shadow-sm">
                <div className="card-header">
                    <h5>Add Member</h5>
                </div>

                <div className="card-body p-2">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input 
                                type="text"
                                name="name" 
                                className={
                                    errors.name ? `form-control is invalid` 
                                    : `form control` 
                                } 
                                value={formData.name}
                                onChange={handleChange}
                            />
                            {errors.name && (
                                <div className="invalid-feedback ps-1">
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input 
                                type="text"
                                name="email" 
                                className={
                                    errors.email ? `form-control is invalid` 
                                    : `form control` 
                                } 
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {errors.email && (
                                <div className="invalid-feedback ps-1">
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Role</label>
                            <select 
                                type="text"
                                name="role" 
                                className={
                                    errors.role ? `form-control is invalid` 
                                    : `form control` 
                                } 
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="Select">Select</option>
                                <option value="user">User</option>
                                <option value="manager">Manager</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            {errors.role && (
                                <div className="invalid-feedback ps-1">
                                    {errors.role}
                                </div>
                            )}
                        </div>
                        <div className="mb-3">
                            <button className="btn btn-primary w-100">
                                {actionLoading ? (
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">
                                            Loading...
                                        </span>
                                    </div>
                                ) : (
                                    <>Add</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        </Can>

        {/* Users table */}
        <div className="col-md-9">
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">Team Members</h5>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center">Name</th>
                      <th className="text-center">Email</th>
                      <th className="text-center">Role</th>
                      {(permissions.canUpdateUsers || permissions.canDeleteUsers) && (
                        <th className="text-center">Actions</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={permissions.canUpdateUsers || permissions.canDeleteUsers ? 4 : 3}
                          className="text-center py-4 text-muted"
                        >
                          No users found. Start by adding one!
                        </td>
                      </tr>
                    )}

                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="align-middle">
                          {editingUserId === user._id ? (
                            <input
                              className="form-control"
                              aria-label="User name"
                              value={editForm.name}
                              onChange={(event) =>
                                setEditForm({ ...editForm, name: event.target.value })
                              }
                            />
                          ) : user.name}
                        </td>
                        <td className="align-middle">{user.email}</td>
                        <td className="align-middle">
                          {editingUserId === user._id ? (
                            <select
                              className="form-select"
                              aria-label="User role"
                              value={editForm.role}
                              onChange={(event) =>
                                setEditForm({ ...editForm, role: event.target.value })
                              }
                            >
                              <option value="user">User</option>
                              <option value="manager">Manager</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : user.role}
                        </td>
                        {(permissions.canUpdateUsers || permissions.canDeleteUsers) && (
                          <td className="align-middle text-center">
                            {editingUserId === user._id ? (
                              <>
                                <button
                                  className="btn btn-sm btn-primary me-2"
                                  disabled={actionLoading}
                                  onClick={() => handleUpdate(user._id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={actionLoading}
                                  onClick={cancelEditing}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {permissions.canUpdateUsers && (
                                  <button
                                    className="btn btn-link text-primary"
                                    onClick={() => startEditing(user)}
                                  >
                                    Edit
                                  </button>
                                )}
                                {permissions.canDeleteUsers && (
                                  <button
                                    className="btn btn-link text-danger"
                                    disabled={actionLoading}
                                    onClick={() => handleDelete(user._id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;
