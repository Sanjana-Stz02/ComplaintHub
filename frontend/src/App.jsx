import { useEffect, useState } from "react";
import {
  createComplaint,
  getComplaintHistory,
  getComplaintStatus,
  getUsers,
  login as loginUser,
  requestLoginOtp,
  searchComplaints,
  signUp,
  updateComplaintPriority,
  updateComplaintStatus,
  updateUserRole,
  verifyLoginOtp
} from "./api/complaintApi";

const STATUS_VALUES = ["Pending", "Assigned", "In Progress", "Resolved", "Rejected"];
const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];
const ROLE_ASSIGN_OPTIONS = ["Citizen", "Worker", "MP", "Admin"];
const STORAGE_KEY = "complainthub-user";

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

export default function App() {
  const [authMode, setAuthMode] = useState("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComplaint, setNewComplaint] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackError, setTrackError] = useState("");

  const [adminId, setAdminId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Assigned");
  const [adminPriority, setAdminPriority] = useState("Medium");
  const [adminMessage, setAdminMessage] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [userAdminMessage, setUserAdminMessage] = useState("");
  const [roleSelections, setRoleSelections] = useState({});

  useEffect(() => {
    const rawUser = window.localStorage.getItem(STORAGE_KEY);

    if (!rawUser) {
      return;
    }

    try {
      setCurrentUser(JSON.parse(rawUser));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadComplaints = async (user = currentUser, nextFilter = historyFilter) => {
    if (!user) {
      setComplaints([]);
      return;
    }

    try {
      const list = await getComplaintHistory({
        userId: user.id,
        role: user.role,
        archived: nextFilter === "all" ? undefined : nextFilter === "archived"
      });
      setComplaints(list);
    } catch {
      setComplaints([]);
    }
  };

  const loadUsers = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin"].includes(user.role)) {
      setUsers([]);
      return;
    }

    try {
      const nextUsers = await getUsers(user.id);
      setUsers(nextUsers);
      const nextSelections = {};
      nextUsers.forEach((nextUser) => {
        nextSelections[nextUser.id] = nextUser.role;
      });
      setRoleSelections(nextSelections);
    } catch {
      setUsers([]);
      setRoleSelections({});
    }
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    loadComplaints();
  }, [currentUser, historyFilter]);

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    if (title.trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchComplaints(title);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [title]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        await signUp({ fullName, email, phone, password });
        setAuthMessage("Account created successfully. Please log in using your credentials.");
        setAuthMode("login");
        setLoginMethod("password");
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setOtpCode("");
        setOtpPreview("");
        return;
      }

      if (loginMethod !== "password") {
        setAuthError("Use the OTP button flow for OTP login.");
        return;
      }

      const response = await loginUser({ identifier: email, password });

      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword("");
      setOtpCode("");
      setOtpPreview("");
      setAuthMessage(`Logged in as ${response.user.fullName}.`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setComplaints([]);
    setUsers([]);
    setTrackId("");
    setTrackedComplaint(null);
    setTrackError("");
    setAuthError("");
    setAuthMessage("");
    setRoleSelections({});
    setAuthMode("login");
    setLoginMethod("password");
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setOtpCode("");
    setOtpPreview("");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleRequestOtpLogin = async () => {
    setAuthError("");
    setAuthMessage("");

    try {
      const response = await requestLoginOtp(email);
      setOtpPreview(response.otpPreview || "");
      setAuthMessage(response.message || "OTP sent. Enter it below to log in.");
    } catch (error) {
      setOtpPreview("");
      setAuthError(error.message);
    }
  };

  const handleVerifyOtpLogin = async () => {
    setAuthError("");
    setAuthMessage("");

    try {
      const response = await verifyLoginOtp({ email, otp: otpCode });
      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword("");
      setOtpCode("");
      setOtpPreview("");
      setAuthMessage(`Logged in as ${response.user.fullName}.`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const totalComplaints = complaints.length;
  const archivedComplaints = complaints.filter((complaint) => complaint.isArchived).length;
  const activeComplaints = totalComplaints - archivedComplaints;
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const handleRoleUpdate = async (userId) => {
    setUserAdminMessage("");

    const role = roleSelections[userId];

    try {
      const response = await updateUserRole({
        requesterId: currentUser.id,
        userId,
        role
      });

      setUserAdminMessage(response.message);

      if (response.user.id === currentUser.id) {
        setCurrentUser(response.user);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      }

      await loadUsers();
    } catch (error) {
      setUserAdminMessage(error.message);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setNewComplaint(null);

    try {
      const created = await createComplaint({ title, description, citizenId: currentUser.id });
      setNewComplaint(created);
      setTitle("");
      setDescription("");
      setSuggestions([]);
      await loadComplaints();
    } catch (error) {
      setSubmitError(error.message);
    }
  };

  const handleTrack = async (event) => {
    event.preventDefault();
    setTrackError("");
    setTrackedComplaint(null);

    try {
      const result = await getComplaintStatus(trackId.trim());
      setTrackedComplaint(result);
    } catch (error) {
      setTrackError(error.message);
    }
  };

  const handleAdminUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");

    try {
      const updated = await updateComplaintStatus(adminId.trim(), adminStatus);
      setAdminMessage(`Updated ${updated.complaintId} to ${updated.status}`);

      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint({
          complaintId: updated.complaintId,
          title: updated.title,
          description: updated.description,
          status: updated.status,
          priority: updated.priority,
          isArchived: updated.isArchived,
          updatedAt: updated.updatedAt,
          createdAt: updated.createdAt
        });
      }

      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handlePriorityUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");

    try {
      const updated = await updateComplaintPriority(adminId.trim(), adminPriority);
      setAdminMessage(`Updated ${updated.complaintId} priority to ${updated.priority}`);

      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            priority: updated.priority,
            updatedAt: updated.updatedAt
          };
        });
      }

      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="container auth-container">
        <section className="auth-hero">
          <p className="eyebrow">ComplaintHub</p>
          <h1>A platform where citizens can report city problems, raise their voices, and work together to make their community better.</h1>
          <p className="hero-copy">
            Log in first, then submit complaints, track status by complaint ID, browse complaint history and archive, and use the FAQ help center.
          </p>
        </section>

        <section className="card auth-card">
          <div className="auth-tabs">
            <button type="button" className={authMode === "signup" ? "tab active" : "tab"} onClick={() => setAuthMode("signup")}>Sign Up</button>
            <button type="button" className={authMode === "login" ? "tab active" : "tab"} onClick={() => setAuthMode("login")}>Login</button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "signup" ? (
              <>
                <label>Full Name</label>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />

                <label>Email</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

                <label>Phone (optional)</label>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+8801XXXXXXXXX" />

                <label>Password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </>
            ) : (
              <>
                <label>Email</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} required />

                <div className="auth-tabs login-method-tabs">
                  <button
                    type="button"
                    className={loginMethod === "password" ? "tab active" : "tab"}
                    onClick={() => {
                      setLoginMethod("password");
                      setAuthError("");
                      setAuthMessage("");
                      setOtpPreview("");
                    }}
                  >
                    Sign in using Password
                  </button>
                  <button
                    type="button"
                    className={loginMethod === "otp" ? "tab active" : "tab"}
                    onClick={() => {
                      setLoginMethod("otp");
                      setAuthError("");
                      setAuthMessage("");
                      setOtpPreview("");
                    }}
                  >
                    Sign in using OTP (Optional)
                  </button>
                </div>

                {loginMethod === "password" ? (
                  <>
                    <label>Password</label>
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  </>
                ) : (
                  <>
                    <label>OTP Code</label>
                    <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="Enter OTP from your email" />
                    <div className="otp-actions">
                      <button type="button" onClick={handleRequestOtpLogin}>Send OTP to Email</button>
                      <button type="button" onClick={handleVerifyOtpLogin}>Verify OTP & Login</button>
                    </div>
                    {otpPreview ? <div className="otp-box">Demo OTP: <strong>{otpPreview}</strong></div> : null}
                  </>
                )}
              </>
            )}

            {authMode === "signup" || loginMethod === "password" ? (
              <button type="submit">{authMode === "signup" ? "Create Account" : "Login"}</button>
            ) : null}
          </form>

          {authError ? <div className="error">{authError}</div> : null}
          {authMessage ? <div className="success">{authMessage}</div> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="hero app-hero">
        <p className="eyebrow">ComplaintHub</p>
        <h1>{isAdmin ? "Admin Dashboard" : "User Dashboard"}</h1>
        <p className="hero-copy">
          {isAdmin
            ? "Manage complaints, assign roles, track status, set priorities, and monitor history and archive records."
            : "Submit complaints, track them by ID, review active and archived history, and use the help center."}
        </p>
        <div className="user-banner hero-user-banner">
          <div>
            Signed in as <strong>{currentUser.fullName}</strong> ({currentUser.role})
          </div>
          <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <section className="card">
        <h3>User Dashboard</h3>
        <div className="dashboard-grid">
          <div className="dashboard-stat">
            <span className="stat-label">Role</span>
            <strong>{currentUser.role}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Total Complaints</span>
            <strong>{totalComplaints}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Active</span>
            <strong>{activeComplaints}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Archived</span>
            <strong>{archivedComplaints}</strong>
          </div>
        </div>
      </section>

      {!isAdmin ? (
        <section className="card">
          <h3>Submit Complaint</h3>
          <form onSubmit={handleCreate}>
            <label>Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />

            <label>Description</label>
            <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required />

            <button type="submit">Create Complaint</button>
          </form>

          {suggestions.length > 0 ? (
            <div className="suggestions">
              <h4>Similar complaints found</h4>
              <p>Check these records before creating a duplicate complaint.</p>
              <ul>
                {suggestions.map((complaint) => (
                  <li key={complaint._id} className="suggestion-item">
                    <strong>{complaint.complaintId}</strong>: {complaint.title}
                    <br />
                    <small>Status: {complaint.status} | Priority: {complaint.priority}</small>
                    <br />
                    <button
                      type="button"
                      onClick={() => {
                        setTrackId(complaint.complaintId);
                        setTrackedComplaint({
                          complaintId: complaint.complaintId,
                          title: complaint.title,
                          description: complaint.description,
                          status: complaint.status,
                          priority: complaint.priority,
                          isArchived: complaint.isArchived,
                          updatedAt: complaint.updatedAt,
                          createdAt: complaint.createdAt
                        });
                        setTrackError("");
                      }}
                    >
                      View Details
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? <div className="error">{submitError}</div> : null}
          {newComplaint ? <div className="success">Complaint created with ID: <strong>{newComplaint.complaintId}</strong></div> : null}
        </section>
      ) : null}

      <section className="card">
        <h3>Track Status by Complaint ID</h3>
        <form onSubmit={handleTrack} className="inline">
          <input
            placeholder="Enter complaint ID (e.g., CMP-20260310-ABC123)"
            value={trackId}
            onChange={(event) => setTrackId(event.target.value)}
            required
          />
          <button type="submit">Track</button>
        </form>

        {trackError ? <div className="error">{trackError}</div> : null}
        {trackedComplaint ? (
          <div className="tracked-card">
            <div className="small">Title: {trackedComplaint.title}</div>
            <div className="small">Description: {trackedComplaint.description || "N/A"}</div>
            <div className="small">Status: <span className="status-pill">{trackedComplaint.status}</span></div>
            <div className="small">Priority: <span className="status-pill">{trackedComplaint.priority}</span></div>
            <div className="small">Archive State: {trackedComplaint.isArchived ? "Archived" : "Active"}</div>
            <div className="small">Last Updated: {formatDate(trackedComplaint.updatedAt)}</div>
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <>
          <section className="card">
            <h3>Admin: User Management</h3>
            <p className="small">Assign roles as Citizen, Worker, MP, or Admin for any registered user.</p>
            {userAdminMessage ? <div className="small">{userAdminMessage}</div> : null}
            {users.length === 0 ? <div className="small">No users available.</div> : null}
            <div className="user-list">
              {users.map((user) => (
                <article key={user.id} className="user-item">
                  <div>
                    <strong>{user.fullName}</strong>
                    <div className="small">{user.email || user.phone || "No contact info"}</div>
                    <div className="small">Current Role: {user.role}</div>
                  </div>
                  <div className="user-actions">
                    <select
                      value={roleSelections[user.id] || user.role}
                      onChange={(event) => {
                        setRoleSelections((previous) => ({
                          ...previous,
                          [user.id]: event.target.value
                        }));
                      }}
                    >
                      {ROLE_ASSIGN_OPTIONS.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>{roleOption}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleRoleUpdate(user.id)}>Save Role</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>Admin: Update Status</h3>
            <form onSubmit={handleAdminUpdate}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>New Status</label>
              <select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value)}>
                {STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <button type="submit">Update Status</button>
            </form>
            {adminMessage ? <div className="small">{adminMessage}</div> : null}
          </section>

          <section className="card">
            <h3>Admin: Set Priority Level</h3>
            <form onSubmit={handlePriorityUpdate}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>Priority Level</label>
              <select value={adminPriority} onChange={(event) => setAdminPriority(event.target.value)}>
                {PRIORITY_VALUES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>

              <button type="submit">Update Priority</button>
            </form>
          </section>
        </>
      ) : null}

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Complaint History and Archive</h3>
            <p className="small">
              {currentUser.role === "Admin" || currentUser.role === "Super Admin"
                ? "Admins can see all complaints and switch between active and archived records."
                : "Citizens can see their complaint history, including archived resolved or rejected items."}
            </p>
          </div>
          <div className="filter-row">
            <button type="button" className={historyFilter === "all" ? "tab active" : "tab"} onClick={() => setHistoryFilter("all")}>All</button>
            <button type="button" className={historyFilter === "active" ? "tab active" : "tab"} onClick={() => setHistoryFilter("active")}>Active</button>
            <button type="button" className={historyFilter === "archived" ? "tab active" : "tab"} onClick={() => setHistoryFilter("archived")}>Archived</button>
          </div>
        </div>

        {complaints.length === 0 ? <div className="small">No complaints found for this view.</div> : null}
        {complaints.map((complaint) => (
          <article key={complaint._id} className="history-item">
            <div className="history-topline">
              <strong>{complaint.complaintId}</strong>
              <span className={complaint.isArchived ? "archive-pill archived" : "archive-pill active-archive"}>
                {complaint.isArchived ? "Archived" : "Active"}
              </span>
            </div>
            <div>{complaint.title}</div>
            <div className="small">{complaint.description}</div>
            <div className="small">Status: {complaint.status} | Priority: {complaint.priority}</div>
            <div className="small">Submitted by: {complaint.citizenId?.fullName || complaint.submittedBy}</div>
            <div className="small">Created: {formatDate(complaint.createdAt)}</div>
          </article>
        ))}
      </section>

      {!isAdmin ? (
        <section className="card">
          <h3>Help Center (FAQ)</h3>
          <p>Common questions for using ComplaintHub.</p>
          <ul className="faq-list">
            <li>
              <strong>Q: How do I sign up?</strong>
              <div>A: Open the Sign Up page, enter your name, email, optional phone, and a password with at least 6 characters.</div>
            </li>
            <li>
              <strong>Q: How do I log in?</strong>
              <div>A: Use the Login page with your email or phone and password.</div>
            </li>
            <li>
              <strong>Q: How do I submit a complaint?</strong>
              <div>A: After logging in, use the Submit Complaint form and keep the generated complaint ID for tracking.</div>
            </li>
            <li>
              <strong>Q: How can I track complaint status?</strong>
              <div>A: Use the Track Status by Complaint ID section and enter the ID created when the complaint was submitted.</div>
            </li>
            <li>
              <strong>Q: Where can I see old complaints?</strong>
              <div>A: Use the Complaint History and Archive section and switch between All, Active, and Archived.</div>
            </li>
            <li>
              <strong>Q: Who can update status and priority?</strong>
              <div>A: Admin users can update complaint status and priority after logging in with admin credentials.</div>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
