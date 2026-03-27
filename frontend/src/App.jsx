import { useEffect, useState } from "react";
import {
  addProgressUpdate,
  assignComplaint,
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
import ComplaintsMap from "./components/ComplaintsMap.jsx";

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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
  const [locationAddress, setLocationAddress] = useState("");
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [submissionPhotoFile, setSubmissionPhotoFile] = useState(null);
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
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [workComplaintId, setWorkComplaintId] = useState("");
  const [workUpdateText, setWorkUpdateText] = useState("");
  const [workPhotoFile, setWorkPhotoFile] = useState(null);
  const [workMessage, setWorkMessage] = useState("");

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
      const firstAssignable = nextUsers.find((nextUser) => ["Worker", "MP"].includes(nextUser.role));
      setAssigneeUserId((previous) => previous || firstAssignable?.id || "");
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

  useEffect(() => {
    const role = currentUser?.role;
    const isAssignable = role === "Worker" || role === "MP";

    if (!isAssignable || complaints.length === 0) {
      return undefined;
    }

    setWorkComplaintId((previous) => {
      if (previous && complaints.some((item) => item.complaintId === previous)) {
        return previous;
      }

      return complaints[0].complaintId;
    });
    return undefined;
  }, [complaints, currentUser]);

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
    setGeoLocation(null);
    setGeoError("");
    setLocationAddress("");
    setSubmissionPhotoFile(null);
    setAssigneeUserId("");
    setAssignMessage("");
    setWorkComplaintId("");
    setWorkUpdateText("");
    setWorkPhotoFile(null);
    setWorkMessage("");
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
  const isWorkerOrMp = currentUser?.role === "Worker" || currentUser?.role === "MP";

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
      let submissionPhoto = "";

      if (submissionPhotoFile) {
        submissionPhoto = await fileToDataUrl(submissionPhotoFile);
      }

      const payload = {
        title,
        description,
        citizenId: currentUser.id,
        submissionPhoto
      };

      const trimmedAddress = locationAddress.trim();

      if (geoLocation) {
        payload.location = {
          lat: geoLocation.lat,
          lng: geoLocation.lng,
          address: trimmedAddress
        };
      } else if (trimmedAddress.length > 0) {
        payload.location = {
          address: trimmedAddress
        };
      }

      const created = await createComplaint(payload);
      setNewComplaint(created);
      setTitle("");
      setDescription("");
      setLocationAddress("");
      setGeoLocation(null);
      setGeoError("");
      setSubmissionPhotoFile(null);
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
      const updated = await updateComplaintStatus(adminId.trim(), adminStatus, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} to ${updated.status}`);

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
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
      const updated = await updateComplaintPriority(adminId.trim(), adminPriority, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} priority to ${updated.priority}`);

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }

      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handleUseLocation = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        setGeoError("Unable to read your location. Allow access in the browser or skip this step.");
      }
    );
  };

  const handleAssignComplaint = async (event) => {
    event.preventDefault();
    setAssignMessage("");

    try {
      const updated = await assignComplaint(adminId.trim(), {
        adminId: currentUser.id,
        assigneeUserId
      });
      setAssignMessage(`Assigned ${updated.complaintId} to ${updated.assignedTo?.fullName || "assignee"}.`);
      await loadComplaints();

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }
    } catch (error) {
      setAssignMessage(error.message);
    }
  };

  const submitWorkerUpdate = async ({ markCompleted }) => {
    setWorkMessage("");

    if (!workComplaintId.trim()) {
      setWorkMessage("Select a complaint first.");
      return;
    }

    try {
      let photoUrl = "";

      if (workPhotoFile) {
        photoUrl = await fileToDataUrl(workPhotoFile);
      }

      const updated = await addProgressUpdate(workComplaintId.trim(), {
        workerId: currentUser.id,
        text: workUpdateText,
        photoUrl,
        markCompleted
      });
      setWorkMessage(markCompleted ? "Task marked complete and log saved." : "Progress update saved.");
      setWorkUpdateText("");
      setWorkPhotoFile(null);
      await loadComplaints();

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }
    } catch (error) {
      setWorkMessage(error.message);
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
        <h1>
          {isAdmin ? "Admin Dashboard" : isWorkerOrMp ? "Worker / MP Dashboard" : "User Dashboard"}
        </h1>
        <p className="hero-copy">
          {isAdmin
            ? "Manage complaints, assign workers or MPs, set status and priority, and review map and history."
            : isWorkerOrMp
              ? "View assigned complaints, add progress updates with photos, mark tasks complete, and track status by ID."
              : "Submit complaints with optional photo and map location, track them by ID, browse history, and use the help center."}
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

      {currentUser.role === "Citizen" ? (
        <section className="card">
          <h3>Submit Complaint</h3>
          <p className="small">Add an optional photo and your location so the issue appears on the map.</p>
          <form onSubmit={handleCreate}>
            <label>Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />

            <label>Description</label>
            <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required />

            <label>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSubmissionPhotoFile(file || null);
              }}
            />

            <label>Location address (optional)</label>
            <input
              value={locationAddress}
              onChange={(event) => setLocationAddress(event.target.value)}
              placeholder="e.g., 1 Kuratoli, Dhaka 1229"
            />
            <p className="small geo-hint muted">
              Type a full address or area: the server looks it up on OpenStreetMap and saves map coordinates. You can
              also use the GPS button below instead of typing, or use both (GPS + address label).
            </p>

            <div className="location-row">
              <button type="button" className="secondary-button" onClick={handleUseLocation}>
                Use my current location
              </button>
              {geoLocation ? (
                <span className="small geo-hint">
                  GPS saved: {geoLocation.lat.toFixed(5)}, {geoLocation.lng.toFixed(5)}
                </span>
              ) : (
                <span className="small geo-hint muted">GPS is optional if your typed address is found.</span>
              )}
            </div>
            {geoError ? <div className="error">{geoError}</div> : null}

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
                      onClick={async () => {
                        setTrackId(complaint.complaintId);
                        setTrackError("");

                        try {
                          const full = await getComplaintStatus(complaint.complaintId);
                          setTrackedComplaint(full);
                        } catch (error) {
                          setTrackError(error.message);
                          setTrackedComplaint(null);
                        }
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
            <div className="small">
              Assigned to:{" "}
              {trackedComplaint.assignedTo?.fullName
                ? `${trackedComplaint.assignedTo.fullName} (${trackedComplaint.assignedTo.role})`
                : "Not assigned yet"}
            </div>
            <div className="small">
              Worker completion: {trackedComplaint.workerTaskCompleted ? "Reported complete" : "Not marked complete"}
            </div>
            <div className="small">Archive State: {trackedComplaint.isArchived ? "Archived" : "Active"}</div>
            <div className="small">Last Updated: {formatDate(trackedComplaint.updatedAt)}</div>
            {trackedComplaint.submissionPhoto ? (
              <div className="tracked-media">
                <div className="small">Submitted photo</div>
                <img src={trackedComplaint.submissionPhoto} alt="Complaint submission" className="complaint-photo" />
              </div>
            ) : null}
            {trackedComplaint.location?.lat != null && trackedComplaint.location?.lng != null ? (
              <div className="tracked-media">
                <div className="small">Location on map</div>
                <ComplaintsMap
                  complaints={[
                    {
                      complaintId: trackedComplaint.complaintId,
                      title: trackedComplaint.title,
                      status: trackedComplaint.status,
                      priority: trackedComplaint.priority,
                      location: trackedComplaint.location
                    }
                  ]}
                />
              </div>
            ) : null}
            {Array.isArray(trackedComplaint.progressLogs) && trackedComplaint.progressLogs.length > 0 ? (
              <div className="progress-logs">
                <div className="small"><strong>Progress log</strong></div>
                <ul>
                  {[...trackedComplaint.progressLogs]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((log) => (
                      <li key={log._id || `${log.createdAt}-${log.text}`} className="progress-log-item">
                        <div className="small">
                          {formatDate(log.createdAt)} · {log.authorName} ·{" "}
                          <span className="status-pill">{log.entryType}</span>
                        </div>
                        <div>{log.text}</div>
                        {log.photoUrl ? (
                          <img src={log.photoUrl} alt="Progress attachment" className="complaint-photo thumb" />
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
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

          <section className="card">
            <h3>Admin: Assign to Worker or MP</h3>
            <p className="small">Route a complaint to a worker or MP. Status is set to Assigned automatically.</p>
            <form onSubmit={handleAssignComplaint}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>Assignee</label>
              <select
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select worker or MP
                </option>
                {users
                  .filter((user) => ["Worker", "MP"].includes(user.role))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </option>
                  ))}
              </select>

              <button type="submit" disabled={!assigneeUserId}>
                Assign complaint
              </button>
            </form>
            {assignMessage ? <div className="small">{assignMessage}</div> : null}
            {users.filter((user) => ["Worker", "MP"].includes(user.role)).length === 0 ? (
              <div className="small">No Worker or MP users yet. Promote accounts under User Management first.</div>
            ) : null}
          </section>
        </>
      ) : null}

      {isWorkerOrMp ? (
        <section className="card">
          <h3>Worker / MP: Progress updates</h3>
          <p className="small">
            Add text and optional photo proof for your assigned complaint, or mark the task complete when finished.
          </p>

          {complaints.length === 0 ? (
            <div className="small">No complaints are assigned to you yet.</div>
          ) : (
            <>
              <label>Assigned complaint</label>
              <select value={workComplaintId} onChange={(event) => setWorkComplaintId(event.target.value)}>
                {complaints.map((complaint) => (
                  <option key={complaint._id} value={complaint.complaintId}>
                    {complaint.complaintId} — {complaint.title}
                  </option>
                ))}
              </select>

              <label>Update details</label>
              <textarea
                rows={4}
                value={workUpdateText}
                onChange={(event) => setWorkUpdateText(event.target.value)}
                placeholder="Describe what you did on site..."
              />

              <label>Photo proof (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setWorkPhotoFile(file || null);
                }}
              />

              <div className="worker-actions">
                <button type="button" onClick={() => submitWorkerUpdate({ markCompleted: false })}>
                  Submit update
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => submitWorkerUpdate({ markCompleted: true })}
                >
                  Task completed
                </button>
              </div>
            </>
          )}

          {workMessage ? <div className="small">{workMessage}</div> : null}
        </section>
      ) : null}

      <section className="card history-archive-card">
        <div className="section-heading">
          <div>
            <h3>Complaint History and Archive</h3>
            <p className="small">
              {currentUser.role === "Admin" || currentUser.role === "Super Admin"
                ? "Admins can see all complaints and switch between active and archived records. Each row can include its own map when coordinates were saved."
                : isWorkerOrMp
                  ? "You see complaints assigned to you. Each entry may show a location map if the citizen provided one."
                  : "Citizens can see their complaint history, including archived items. A small map appears on each complaint that has a saved location."}
            </p>
          </div>
          <div className="filter-row">
            <button type="button" className={historyFilter === "all" ? "tab active" : "tab"} onClick={() => setHistoryFilter("all")}>All</button>
            <button type="button" className={historyFilter === "active" ? "tab active" : "tab"} onClick={() => setHistoryFilter("active")}>Active</button>
            <button type="button" className={historyFilter === "archived" ? "tab active" : "tab"} onClick={() => setHistoryFilter("archived")}>Archived</button>
          </div>
        </div>

        {complaints.length === 0 ? <div className="small">No complaints found for this view.</div> : null}
        {complaints.map((complaint) => {
          const hasMapLocation =
            complaint.location &&
            typeof complaint.location.lat === "number" &&
            typeof complaint.location.lng === "number";

          return (
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
              {complaint.assignedTo ? (
                <div className="small">
                  Assigned to: {complaint.assignedTo.fullName} ({complaint.assignedTo.role})
                </div>
              ) : null}
              <div className="small">Created: {formatDate(complaint.createdAt)}</div>

              {hasMapLocation ? (
                <div className="history-item-map">
                  <div className="small history-item-map-label">Location</div>
                  <ComplaintsMap complaints={[complaint]} variant="mini" />
                </div>
              ) : (
                <div className="small history-item-map-missing">No map location was provided for this complaint.</div>
              )}
            </article>
          );
        })}
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
