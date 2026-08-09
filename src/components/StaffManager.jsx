import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiUserPlus, FiX } from "react-icons/fi";
import api from "../api/axios";

const EMPTY_FORM = { name: "", email: "", password: "", position: "Kitchen Staff" };
const unwrapStaff = (data) => data?.staff || data?.user || data;

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchStaff = useCallback(async () => {
    try {
      setFetching(true);
      setError("");
      const response = await api.get("/staff");
      const result = response.data?.staff || response.data?.users || response.data || [];
      setStaff(Array.isArray(result) ? result : []);
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not load staff. Try again.");
      return false;
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const resetForm = () => { setEditingId(null); setFormData(EMPTY_FORM); setError(""); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (formData.password && formData.password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      if (editingId && !payload.password) delete payload.password;
      const response = editingId
        ? await api.put(`/staff/${editingId}`, payload)
        : await api.post("/staff/create", payload);
      const saved = unwrapStaff(response.data);
      if (!saved?._id) {
        const refreshed = await fetchStaff();
        if (!refreshed) return;
      } else if (editingId) {
        setStaff((current) => current.map((item) => item._id === editingId ? { ...item, ...saved } : item));
      } else {
        setStaff((current) => [saved, ...current.filter((item) => item._id !== saved._id)]);
      }
      setMessage(editingId ? "Staff details updated." : "Staff account created.");
      resetForm();
    } catch (requestError) {
      const status = requestError?.response?.status;
      const serverMessage = requestError?.response?.data?.message || requestError?.response?.data?.error;
      setError(serverMessage || (status === 409 ? "This email is already being used." : "Could not save staff. Check the details and try again."));
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      setError("");
      await api.delete(`/staff/${id}`);
      setStaff((current) => current.filter((item) => item._id !== id));
      setMessage("Staff member removed.");
      if (editingId === id) resetForm();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not remove staff.");
    }
  };

  const editStaff = (user) => {
    setEditingId(user._id);
    setFormData({ name: user.name || "", email: user.email || "", password: "", position: user.position || "Kitchen Staff" });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <section className="owner-staff">
    <div className="owner-section-heading"><div><h1>Staff</h1><p>Create or update staff access</p></div><FiUserPlus /></div>
    {error && <div className="ops-inline-error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><FiX /></button></div>}
    {message && <div className="ops-inline-success" role="status"><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><FiX /></button></div>}
    <form className="owner-staff-form" onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="Staff name" autoComplete="name" required />
      <input name="email" type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} placeholder="Email" autoComplete="email" required />
      <input name="password" type="password" value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} placeholder={editingId ? "New password (optional)" : "Password"} autoComplete="new-password" required={!editingId} />
      <select name="position" value={formData.position} onChange={(event) => setFormData((current) => ({ ...current, position: event.target.value }))}><option>Kitchen Staff</option><option>Waiter</option><option>Cashier</option><option>Manager</option></select>
      <div><button type="submit" disabled={loading}>{loading ? (editingId ? "Updating…" : "Creating…") : (editingId ? "Update staff" : "Add staff")}</button>{editingId && <button type="button" onClick={resetForm}>Cancel</button>}</div>
    </form>
    <div className="owner-staff-list">
      {fetching ? <p className="ops-empty-row">Loading staff…</p> : staff.length ? staff.map((user) => <article key={user._id}><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.position || user.role || "Staff"}</small></div><button type="button" aria-label={`Edit ${user.name}`} onClick={() => editStaff(user)}><FiEdit2 /></button><button type="button" aria-label={`Remove ${user.name}`} onClick={() => deleteStaff(user._id)}><FiTrash2 /></button></article>) : <p className="ops-empty-row">No staff members yet</p>}
    </div>
  </section>;
}
