import { useEffect, useState } from "react";
import {
  createComplaint,
  getAllComplaints,
  getComplaintStatus,
  updateComplaintPriority,
  updateComplaintStatus
} from "./api/complaintApi";

const STATUS_VALUES = ["Pending", "Assigned", "In Progress", "Resolved", "Rejected"];
const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];

export default function App() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComplaint, setNewComplaint] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackError, setTrackError] = useState("");

  const [adminId, setAdminId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Assigned");
  const [adminPriority, setAdminPriority] = useState("Medium");
  const [adminMessage, setAdminMessage] = useState("");
  const [complaints, setComplaints] = useState([]);

  const loadComplaints = async () => {
    try {
      const list = await getAllComplaints();
      setComplaints(list);
    } catch {
      setComplaints([]);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setNewComplaint(null);

    try {
      const created = await createComplaint({ title, description });
      setNewComplaint(created);
      setTitle("");
      setDescription("");
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
          status: updated.status,
          updatedAt: updated.updatedAt
        });
      }
      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  return (
    <div className="container">
      <h1>Feature: Complaint Status Tracking</h1>

      <section className="card">
        <h3>1) Submit Complaint</h3>
        <form onSubmit={handleCreate}>
          <label>Title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />

          <label>Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />

          <button type="submit">Create Complaint</button>
        </form>
        {submitError ? <div className="error">{submitError}</div> : null}
        {newComplaint ? (
          <div className="success">
            Complaint created with ID: <strong>{newComplaint.complaintId}</strong>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>2) Track Status by Complaint ID</h3>
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
          <div>
            <div className="small">Title: {trackedComplaint.title}</div>
            <div className="small">
              Status: <span className="status-pill">{trackedComplaint.status}</span>
            </div>
            <div className="small">
              Priority: <span className="status-pill">{trackedComplaint.priority}</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>3) Admin: Update Status</h3>
        <form onSubmit={handleAdminUpdate}>
          <label>Complaint ID</label>
          <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

          <label>New Status</label>
          <select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value)}>
            {STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="submit">Update Status</button>
        </form>
        {adminMessage ? <div className="small">{adminMessage}</div> : null}
      </section>

      <section className="card">
        <h3>4) Admin: Set Priority Level</h3>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setAdminMessage("");

            try {
              const updated = await updateComplaintPriority(adminId.trim(), adminPriority);
              setAdminMessage(`Updated ${updated.complaintId} priority to ${updated.priority}`);
              if (trackId.trim() === updated.complaintId) {
                setTrackedComplaint((prev) => {
                  if (!prev) {
                    return prev;
                  }

                  return {
                    ...prev,
                    priority: updated.priority,
                    updatedAt: updated.updatedAt
                  };
                });
              }
              await loadComplaints();
            } catch (error) {
              setAdminMessage(error.message);
            }
          }}
        >
          <label>Complaint ID</label>
          <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

          <label>Priority Level</label>
          <select value={adminPriority} onChange={(event) => setAdminPriority(event.target.value)}>
            {PRIORITY_VALUES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <button type="submit">Update Priority</button>
        </form>
      </section>

      <section className="card">
        <h3>Recent Complaints</h3>
        {complaints.length === 0 ? (
          <div className="small">No complaints yet.</div>
        ) : (
          complaints.slice(0, 10).map((complaint) => (
            <div key={complaint._id} className="small">
              {complaint.complaintId} — {complaint.title} — {complaint.status} — {complaint.priority}
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h3>Help Center (FAQ)</h3>
        <p>Need help? Here are some common questions and answers about ComplaintHub.</p>
        <ul className="faq-list">
          <li>
            <strong>Q: How do I submit a complaint?</strong>
            <div>A: Fill in the title and description in the "Submit Complaint" form and click "Create Complaint".</div>
          </li>
          <li>
            <strong>Q: How can I track my complaint status?</strong>
            <div>A: Use the "Track Status by Complaint ID" section and enter the ID provided after submission.</div>
          </li>
          <li>
            <strong>Q: How do I change complaint status or priority?</strong>
            <div>A: Admin users can update status and priority using the controls in the admin sections.</div>
          </li>
          <li>
            <strong>Q: What does each status mean?</strong>
            <div>
              A: Pending = waiting assignment, Assigned = assigned to worker, In Progress = being serviced, Resolved = completed, Rejected = rejected.
            </div>
          </li>
          <li>
            <strong>Q: What priority level should I choose?</strong>
            <div>
              A: Use Low for minor issues and Emergency for urgent safety-related problems. Admin can update if needed.
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
