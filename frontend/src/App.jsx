import { useEffect, useMemo, useState } from "react";
import {
  addProgressUpdate,
  assignComplaint,
  createComplaint,
  exportComplaintsCsv,
  exportComplaintsPdf,
  filterComplaints,
  getAnalytics,
  getCategoryReports,
  getComplaintHistory,
  getComplaintStatus,
  getNotifications,
  getUsers,
  getWorkerDashboard,
  login as loginUser,
  markAllNotificationsRead,
  markNotificationRead,
  requestLoginOtp,
  searchComplaints,
  signUp,
  updateComplaintDeadline,
  updateComplaintPriority,
  updateComplaintStatus,
  updateUserRole,
  verifyLoginOtp
} from "./api/complaintApi";
import ComplaintsMap from "./components/ComplaintsMap.jsx";
import StatusTimeline from "./components/StatusTimeline.jsx";
import FaqAccordion from "./components/FaqAccordion.jsx";
import CategoryReportsChart from "./components/CategoryReportsChart.jsx";
import InlineComments from "./components/InlineComments.jsx";
import ComplaintCard from "./components/ComplaintCard.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Icon from "./components/Icon.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import FeedbackForm from "./components/FeedbackForm.jsx";
import Toast from "./components/Toast.jsx";
import {
  deadlineBadge,
  formatDate,
  priorityClass,
  statusClass
} from "./utils/format";

const STATUS_VALUES = ["Pending", "Assigned", "In Progress", "Resolved", "Rejected"];
const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];
const CATEGORY_VALUES = [
  "Roads & Infrastructure", "Water & Sewage", "Electricity", "Garbage & Waste",
  "Public Safety", "Noise & Pollution", "Parks & Recreation", "Transportation",
  "Building & Housing", "Other"
];
const ROLE_ASSIGN_OPTIONS = ["Citizen", "Worker", "Leader", "Admin"];
const STORAGE_KEY = "complainthub-user";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DESCRIPTION = 1000;

const FAQ_CITIZEN = [
  { q: "How do I submit a complaint?", a: "Go to Submit, fill in the title, description, and optional photo/location. A unique complaint ID is generated for tracking." },
  { q: "How do I track a complaint?", a: "Open Track and enter the complaint ID. You'll see a visual progress timeline, the assigned worker, and a discussion thread." },
  { q: "How do notifications work?", a: "Click the bell in the header. You'll see real-time updates on status changes, assignments, comments, and worker progress." },
  { q: "Where are my past complaints?", a: "Open History and switch between All, Active, and Archived tabs to see every complaint you've filed." },
  { q: "How do I leave feedback?", a: "Once your complaint is Resolved, open Track and submit a star rating with an optional comment. Feedback helps us improve the service." },
  { q: "Can I discuss a complaint with workers or admins?", a: "Yes. Expand any complaint card and use the Discussion section \u2014 everyone involved can post updates." },
  { q: "What's the OTP login for?", a: "Instead of a password, request a one-time passcode by email. Useful if you forget your password." }
];

const FAQ_WORKER = [
  { q: "Where are my assigned tasks?", a: "Open Tasks. You'll see active tasks with deadlines, priority, and overdue/due-soon highlighting." },
  { q: "How do I post a progress update?", a: "Go to Progress, pick the complaint, add a note and optional photo, then submit. Mark 'complete' when the task is finished." },
  { q: "Can I comment on a complaint?", a: "Yes. Expand any task card and use the Discussion section to communicate with the citizen and admins." },
  { q: "What happens when I complete a task?", a: "After the admin marks the complaint Resolved, the citizen can leave a rating. You'll get a notification when that happens." }
];

const FAQ_ADMIN = [
  { q: "How do I assign a complaint?", a: "Open Controls \u2192 Assign. Enter the complaint ID, pick a Leader, and optionally set a deadline. The Leader will then delegate to a worker." },
  { q: "How do deadlines work?", a: "Deadlines help workers prioritize. Overdue tasks are flagged red on the worker dashboard and notifications are sent when a deadline changes." },
  { q: "What does Analytics show?", a: "Analytics shows complaint volume over time, resolution rate, average resolution time, status/priority/category breakdowns, worker performance, and citizen ratings." },
  { q: "How do I export reports?", a: "Open Reports and click Export CSV or Export PDF. Any filters you've applied in Complaints are carried over to the export." },
  { q: "Where are categorized reports?", a: "Reports shows a chart and breakdown (pending, assigned, in progress, resolved, rejected, resolution rate) by category." },
  { q: "How does RBAC work?", a: "Citizens can only submit and track their own complaints. Workers/Leaders see only assigned tasks. Admins can manage everything. Super Admins can additionally assign roles." },
  { q: "How do I filter complaints?", a: "Open Complaints. Combine status, category, priority, area, assignee, date range, and keywords. Active filters show as dismissible chips." }
];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const roleKey = (role) => (role || "").toLowerCase().replace(/\s+/g, "-");

export default function App() {
  // Auth state
  const [authMode, setAuthMode] = useState("login");
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
  const [showPassword, setShowPassword] = useState(false);

  // Submit complaint
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Other");
  const [locationAddress, setLocationAddress] = useState("");
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [submissionPhotoFile, setSubmissionPhotoFile] = useState(null);
  const [submissionPhotoPreview, setSubmissionPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newComplaint, setNewComplaint] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Track
  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackError, setTrackError] = useState("");

  // Admin
  const [adminId, setAdminId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Assigned");
  const [adminPriority, setAdminPriority] = useState("Medium");
  const [adminDeadline, setAdminDeadline] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [userAdminMessage, setUserAdminMessage] = useState("");
  const [roleSelections, setRoleSelections] = useState({});
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignMessage, setAssignMessage] = useState("");

  // Worker
  const [workComplaintId, setWorkComplaintId] = useState("");
  const [workUpdateText, setWorkUpdateText] = useState("");
  const [workPhotoFile, setWorkPhotoFile] = useState(null);
  const [workMessage, setWorkMessage] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterResults, setFilterResults] = useState([]);
  const [filterMessage, setFilterMessage] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [filterRan, setFilterRan] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dashboards
  const [workerDashData, setWorkerDashData] = useState(null);
  const [categoryReports, setCategoryReports] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Exports
  const [exporting, setExporting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const pushToast = (message, tone = "info") => setToast({ message, tone });
  const dismissToast = () => setToast(null);

  // UI
  const [expandedCommentId, setExpandedCommentId] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Theme (dark/light)
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("complaintHubTheme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("complaintHubTheme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Restore user
  useEffect(() => {
    const rawUser = window.localStorage.getItem(STORAGE_KEY);
    if (!rawUser) return;
    try { setCurrentUser(JSON.parse(rawUser)); }
    catch { window.localStorage.removeItem(STORAGE_KEY); }
  }, []);

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
  const isLeader = currentUser?.role === "Leader";
  const isWorker = currentUser?.role === "Worker";
  const isWorkerOrLeader = isWorker || isLeader;
  const isAdminOrLeader = isAdmin || isLeader;
  const isCitizen = currentUser?.role === "Citizen";

  // Data loaders
  const loadComplaints = async (user = currentUser, nextFilter = historyFilter) => {
    if (!user) { setComplaints([]); return; }
    try {
      const list = await getComplaintHistory({
        userId: user.id,
        role: user.role,
        archived: nextFilter === "all" ? undefined : nextFilter === "archived"
      });
      setComplaints(list);
    } catch { setComplaints([]); }
  };

  const loadUsers = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin", "Leader"].includes(user.role)) { setUsers([]); return; }
    try {
      const nextUsers = await getUsers(user.id);
      setUsers(nextUsers);
      const nextSelections = {};
      nextUsers.forEach((u) => { nextSelections[u.id] = u.role; });
      setRoleSelections(nextSelections);
      const assignableRoles = user.role === "Leader" ? ["Worker"] : ["Leader"];
      const firstAssignable = nextUsers.find((u) => assignableRoles.includes(u.role));
      setAssigneeUserId((previous) => previous || firstAssignable?.id || "");
    } catch { setUsers([]); setRoleSelections({}); }
  };

  const loadNotifications = async (user = currentUser) => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    try {
      const data = await getNotifications(user.id);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { setNotifications([]); setUnreadCount(0); }
  };

  const loadWorkerDashboard = async (user = currentUser) => {
    if (!user || !["Worker", "Leader"].includes(user.role)) { setWorkerDashData(null); return; }
    try { setWorkerDashData(await getWorkerDashboard(user.id)); }
    catch { setWorkerDashData(null); }
  };

  const loadCategoryReports = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin", "Leader"].includes(user.role)) { setCategoryReports([]); return; }
    try { setCategoryReports(await getCategoryReports(user.id)); }
    catch { setCategoryReports([]); }
  };

  const loadAnalytics = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin", "Leader"].includes(user.role)) { setAnalyticsData(null); return; }
    setAnalyticsLoading(true);
    try { setAnalyticsData(await getAnalytics(user.id)); }
    catch { setAnalyticsData(null); }
    finally { setAnalyticsLoading(false); }
  };

  useEffect(() => { if (currentUser) loadComplaints(); }, [currentUser, historyFilter]);
  useEffect(() => { loadUsers(); }, [currentUser]);
  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
    const interval = setInterval(() => loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, [currentUser]);
  useEffect(() => { if (currentUser) loadWorkerDashboard(); }, [currentUser]);
  useEffect(() => { if (currentUser) loadCategoryReports(); }, [currentUser]);
  useEffect(() => { if (currentUser) loadAnalytics(); }, [currentUser]);

  // Similarity suggestions while typing
  useEffect(() => {
    if (title.trim().length < 3) { setSuggestions([]); return undefined; }
    const timeoutId = window.setTimeout(async () => {
      try { setSuggestions(await searchComplaints(title)); }
      catch { setSuggestions([]); }
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [title]);

  useEffect(() => {
    const role = currentUser?.role;
    const isAssignable = role === "Worker" || role === "Leader";
    if (!isAssignable || complaints.length === 0) return undefined;
    setWorkComplaintId((prev) =>
      prev && complaints.some((i) => i.complaintId === prev) ? prev : complaints[0].complaintId
    );
    return undefined;
  }, [complaints, currentUser]);

  // Role-aware nav items
  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { id: "overview", label: "Overview", icon: "dashboard" },
        { id: "analytics", label: "Analytics", icon: "chart" },
        { id: "complaints", label: "Complaints", icon: "search" },
        { id: "track", label: "Track", icon: "map" },
        { id: "users", label: "Users", icon: "users" },
        { id: "controls", label: "Controls", icon: "settings" },
        { id: "reports", label: "Reports", icon: "upload" },
        { id: "help", label: "Help", icon: "help" }
      ];
    }
    if (isLeader) {
      return [
        { id: "overview", label: "Overview", icon: "dashboard" },
        { id: "analytics", label: "Analytics", icon: "chart" },
        { id: "complaints", label: "Complaints", icon: "search" },
        { id: "tasks", label: "My Tasks", icon: "inbox" },
        { id: "progress", label: "Post Update", icon: "upload" },
        { id: "controls", label: "Controls", icon: "settings" },
        { id: "reports", label: "Reports", icon: "upload" },
        { id: "track", label: "Track", icon: "map" },
        { id: "help", label: "Help", icon: "help" }
      ];
    }
    if (isWorker) {
      return [
        { id: "overview", label: "Overview", icon: "dashboard" },
        { id: "tasks", label: "My Tasks", icon: "inbox" },
        { id: "complaints", label: "Complaints", icon: "search" },
        { id: "progress", label: "Post Update", icon: "upload" },
        { id: "track", label: "Track", icon: "map" },
        { id: "help", label: "Help", icon: "help" }
      ];
    }
    return [
      { id: "overview", label: "Overview", icon: "dashboard" },
      { id: "submit", label: "Submit", icon: "plus" },
      { id: "track", label: "Track", icon: "map" },
      { id: "history", label: "History", icon: "history" },
      { id: "help", label: "Help", icon: "help" }
    ];
  }, [isAdmin, isLeader, isWorker]);

  useEffect(() => {
    if (!navItems.some((n) => n.id === activeView)) {
      setActiveView(navItems[0]?.id || "overview");
    }
  }, [navItems, activeView]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filterStatus) chips.push({ label: `Status: ${filterStatus}`, clear: () => setFilterStatus("") });
    if (filterCategory) chips.push({ label: `Category: ${filterCategory}`, clear: () => setFilterCategory("") });
    if (filterPriority) chips.push({ label: `Priority: ${filterPriority}`, clear: () => setFilterPriority("") });
    if (filterArea) chips.push({ label: `Area: ${filterArea}`, clear: () => setFilterArea("") });
    if (filterDateFrom) chips.push({ label: `From: ${filterDateFrom}`, clear: () => setFilterDateFrom("") });
    if (filterDateTo) chips.push({ label: `To: ${filterDateTo}`, clear: () => setFilterDateTo("") });
    if (filterKeyword) chips.push({ label: `Keyword: ${filterKeyword}`, clear: () => setFilterKeyword("") });
    if (filterAssignee) {
      const label = filterAssignee === "unassigned"
        ? "Unassigned"
        : `Assignee: ${users.find((u) => u.id === filterAssignee)?.fullName || "User"}`;
      chips.push({ label, clear: () => setFilterAssignee("") });
    }
    return chips;
  }, [filterStatus, filterCategory, filterPriority, filterArea, filterDateFrom, filterDateTo, filterKeyword, filterAssignee, users]);

  // Handlers
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError(""); setAuthMessage("");
    try {
      if (authMode === "signup") {
        await signUp({ fullName, email, phone, password });
        setAuthMessage("Account created. Please log in below.");
        setAuthMode("login"); setLoginMethod("password");
        setFullName(""); setEmail(""); setPhone(""); setPassword("");
        setOtpCode(""); setOtpPreview("");
        return;
      }
      if (loginMethod !== "password") {
        setAuthError("Use the OTP buttons below for OTP login.");
        return;
      }
      const response = await loginUser({ identifier: email, password });
      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword(""); setOtpCode(""); setOtpPreview("");
    } catch (error) { setAuthError(error.message); }
  };

  const handleRequestOtpLogin = async () => {
    setAuthError(""); setAuthMessage("");
    try {
      const response = await requestLoginOtp(email);
      setOtpPreview(response.otpPreview || "");
      setAuthMessage(response.message || "OTP sent. Enter it below to log in.");
    } catch (error) { setOtpPreview(""); setAuthError(error.message); }
  };

  const handleVerifyOtpLogin = async () => {
    setAuthError(""); setAuthMessage("");
    try {
      const response = await verifyLoginOtp({ email, otp: otpCode });
      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword(""); setOtpCode(""); setOtpPreview("");
    } catch (error) { setAuthError(error.message); }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setComplaints([]); setUsers([]);
    setTrackId(""); setTrackedComplaint(null); setTrackError("");
    setGeoLocation(null); setGeoError(""); setLocationAddress("");
    setSubmissionPhotoFile(null); setSubmissionPhotoPreview(""); setPhotoError("");
    setAssigneeUserId(""); setAssignDeadline(""); setAssignMessage("");
    setWorkComplaintId(""); setWorkUpdateText(""); setWorkPhotoFile(null); setWorkMessage("");
    setAuthError(""); setAuthMessage(""); setRoleSelections({});
    setAuthMode("login"); setLoginMethod("password");
    setFullName(""); setEmail(""); setPhone(""); setPassword("");
    setOtpCode(""); setOtpPreview(""); setShowPassword(false);
    setNotifications([]); setUnreadCount(0); setShowNotifications(false);
    setWorkerDashData(null); setCategoryReports([]);
    setAnalyticsData(null); setExporting(false); setToast(null);
    setFilterResults([]); setFilterMessage(""); setExpandedCommentId("");
    setActiveView("overview");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleRoleUpdate = async (userId) => {
    setUserAdminMessage("");
    const role = roleSelections[userId];
    try {
      const response = await updateUserRole({
        requesterId: currentUser.id, userId, role
      });
      setUserAdminMessage(response.message);
      if (response.user.id === currentUser.id) {
        setCurrentUser(response.user);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      }
      await loadUsers();
    } catch (error) { setUserAdminMessage(error.message); }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setPhotoError("");
    if (!file) { setSubmissionPhotoFile(null); setSubmissionPhotoPreview(""); return; }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo is too large. Please upload an image under 5 MB.");
      setSubmissionPhotoFile(null); setSubmissionPhotoPreview("");
      event.target.value = "";
      return;
    }
    setSubmissionPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setSubmissionPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitError(""); setNewComplaint(null); setCreating(true);
    try {
      let submissionPhoto = "";
      if (submissionPhotoFile) submissionPhoto = await fileToDataUrl(submissionPhotoFile);

      const payload = {
        title, description,
        citizenId: currentUser.id,
        category: complaintCategory,
        submissionPhoto
      };

      const trimmedAddress = locationAddress.trim();
      if (geoLocation) {
        payload.location = { lat: geoLocation.lat, lng: geoLocation.lng, address: trimmedAddress };
      } else if (trimmedAddress.length > 0) {
        payload.location = { address: trimmedAddress };
      }

      const created = await createComplaint(payload);
      setNewComplaint(created);
      setTitle(""); setDescription(""); setComplaintCategory("Other");
      setLocationAddress(""); setGeoLocation(null); setGeoError("");
      setSubmissionPhotoFile(null); setSubmissionPhotoPreview(""); setPhotoError("");
      setSuggestions([]);
      await loadComplaints();
    } catch (error) { setSubmitError(error.message); }
    finally { setCreating(false); }
  };

  const handleTrack = async (event) => {
    event.preventDefault();
    setTrackError(""); setTrackedComplaint(null);
    try { setTrackedComplaint(await getComplaintStatus(trackId.trim())); }
    catch (error) { setTrackError(error.message); }
  };

  const handleAdminUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");
    try {
      const updated = await updateComplaintStatus(adminId.trim(), adminStatus, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} to ${updated.status}.`);
      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint(await getComplaintStatus(updated.complaintId));
      }
      await loadComplaints();
      await loadCategoryReports();
    } catch (error) { setAdminMessage(error.message); }
  };

  const handlePriorityUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");
    try {
      const updated = await updateComplaintPriority(adminId.trim(), adminPriority, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} priority to ${updated.priority}.`);
      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint(await getComplaintStatus(updated.complaintId));
      }
      await loadComplaints();
    } catch (error) { setAdminMessage(error.message); }
  };

  const handleDeadlineUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");
    try {
      const updated = await updateComplaintDeadline(adminId.trim(), {
        adminId: currentUser.id,
        deadline: adminDeadline || null
      });
      setAdminMessage(
        adminDeadline
          ? `Deadline for ${updated.complaintId} set to ${new Date(adminDeadline).toLocaleDateString()}.`
          : `Deadline removed for ${updated.complaintId}.`
      );
      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint(await getComplaintStatus(updated.complaintId));
      }
      await loadComplaints();
    } catch (error) { setAdminMessage(error.message); }
  };

  const handleUseLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
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
        assigneeUserId,
        deadline: assignDeadline || null
      });
      const deadlinePart = updated.deadline
        ? ` with deadline ${new Date(updated.deadline).toLocaleDateString()}`
        : "";
      setAssignMessage(
        `Assigned ${updated.complaintId} to ${updated.assignedTo?.fullName || "assignee"}${deadlinePart}.`
      );
      setAssignDeadline("");
      await loadComplaints();
      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint(await getComplaintStatus(updated.complaintId));
      }
    } catch (error) { setAssignMessage(error.message); }
  };

  const submitWorkerUpdate = async ({ markCompleted }) => {
    setWorkMessage("");
    if (!workComplaintId.trim()) { setWorkMessage("Select a complaint first."); return; }
    try {
      let photoUrl = "";
      if (workPhotoFile) {
        if (workPhotoFile.size > MAX_PHOTO_BYTES) {
          setWorkMessage("Photo is too large. Please upload an image under 5 MB.");
          return;
        }
        photoUrl = await fileToDataUrl(workPhotoFile);
      }
      const updated = await addProgressUpdate(workComplaintId.trim(), {
        workerId: currentUser.id,
        text: workUpdateText, photoUrl, markCompleted
      });
      setWorkMessage(markCompleted ? "Task marked complete and log saved." : "Progress update saved.");
      setWorkUpdateText(""); setWorkPhotoFile(null);
      await loadComplaints(); await loadWorkerDashboard();
      if (trackId.trim() === updated.complaintId) {
        setTrackedComplaint(await getComplaintStatus(updated.complaintId));
      }
    } catch (error) { setWorkMessage(error.message); }
  };

  const buildFilterPayload = () => ({
    requesterId: currentUser?.id,
    status: filterStatus,
    category: filterCategory,
    priority: filterPriority,
    area: filterArea,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    keyword: filterKeyword,
    assignee: filterAssignee
  });

  const handleFilterSearch = async (event) => {
    event.preventDefault();
    setFilterMessage(""); setFilterRan(true);
    try {
      const results = await filterComplaints(buildFilterPayload());
      setFilterResults(results);
      setFilterMessage(`Found ${results.length} complaint${results.length === 1 ? "" : "s"}.`);
    } catch (error) { setFilterMessage(error.message); setFilterResults([]); }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const payload = buildFilterPayload();
      if (format === "csv") await exportComplaintsCsv(payload);
      else await exportComplaintsPdf(payload);
      pushToast(`${format.toUpperCase()} export downloaded.`, "success");
    } catch (error) { pushToast(error.message, "error"); }
    finally { setExporting(false); }
  };

  const handleFeedbackSubmitted = async () => {
    if (trackedComplaint) {
      try { setTrackedComplaint(await getComplaintStatus(trackedComplaint.complaintId)); }
      catch {}
    }
    await loadComplaints();
    await loadAnalytics();
    pushToast("Thanks! Your feedback was recorded.", "success");
  };

  const handleClearFilters = () => {
    setFilterStatus(""); setFilterCategory(""); setFilterPriority("");
    setFilterArea(""); setFilterDateFrom(""); setFilterDateTo("");
    setFilterKeyword(""); setFilterAssignee("");
    setFilterResults([]); setFilterMessage(""); setFilterRan(false);
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try { await markNotificationRead(notificationId); await loadNotifications(); }
    catch {}
  };

  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead(currentUser.id); await loadNotifications(); }
    catch {}
  };

  const toggleExpandComments = (complaintId) => {
    setExpandedCommentId((prev) => (prev === complaintId ? "" : complaintId));
  };

  const handleTrackFromCard = async (complaintId) => {
    setTrackId(complaintId); setTrackError("");
    try { setTrackedComplaint(await getComplaintStatus(complaintId)); setActiveView("track"); }
    catch (error) { setTrackError(error.message); }
  };

  const renderCard = (complaint, extra = {}) => (
    <ComplaintCard
      key={complaint._id}
      complaint={complaint}
      currentUser={currentUser}
      expandedCommentId={expandedCommentId}
      onToggleDiscussion={toggleExpandComments}
      onTrack={handleTrackFromCard}
      onFeedbackSubmitted={handleFeedbackSubmitted}
      {...extra}
    />
  );

  const totalComplaints = complaints.length;
  const archivedComplaints = complaints.filter((c) => c.isArchived).length;
  const activeComplaintsCount = totalComplaints - archivedComplaints;

  /* ==========================
     AUTH PAGE
     ========================== */
  if (!currentUser) {
    return (
      <div className="auth-shell">
        <button
          type="button"
          className="icon-button icon-button-ghost auth-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <section className="auth-brand">
          <div className="auth-brand-header">
            <div className="brand-logo" aria-hidden="true">
              <Icon name="check" size={20} strokeWidth={3} />
            </div>
            <div>
              <div className="brand-name" style={{ color: "#fff", fontSize: "16px" }}>ComplaintHub</div>
              <div className="brand-tag">Civic Platform</div>
            </div>
          </div>

          <div className="auth-brand-body">
            <p className="auth-eyebrow">Civic voice, delivered</p>
            <h1>Report city problems, track every step, and see them resolved.</h1>
            <p>
              ComplaintHub connects citizens, workers, and administrators on a single platform — with
              real-time notifications, progress timelines, and category-wise reports.
            </p>

            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icon name="plus" size={18} /></div>
                <div>
                  <h4>Submit in seconds</h4>
                  <p>Add a photo and map pin. Get a unique tracking ID instantly.</p>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icon name="bell" size={18} /></div>
                <div>
                  <h4>Real-time updates</h4>
                  <p>Notifications the moment anything changes on your complaint.</p>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icon name="chat" size={18} /></div>
                <div>
                  <h4>Open discussion</h4>
                  <p>Citizens, workers, and admins discuss complaints together.</p>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icon name="chart" size={18} /></div>
                <div>
                  <h4>Clear insights</h4>
                  <p>Category reports and dashboards give every stakeholder clarity.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-footer-note">© {new Date().getFullYear()} ComplaintHub · Built for better cities</div>
        </section>

        <section className="auth-form-wrap">
          <div className="auth-card">
            <h2>{authMode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <span className="small">
              {authMode === "signup"
                ? "Sign up in seconds \u2014 no credit card required."
                : "Sign in to submit, track, and discuss complaints."}
            </span>

            <div className="auth-tabs">
              <button type="button" className={authMode === "signup" ? "tab active" : "tab"} onClick={() => setAuthMode("signup")}>Sign Up</button>
              <button type="button" className={authMode === "login" ? "tab active" : "tab"} onClick={() => setAuthMode("login")}>Login</button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === "signup" ? (
                <>
                  <label>Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <label>Phone (optional)</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
                  <label>Password</label>
                  <div className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label>Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} required />

                  <div className="auth-tabs login-method-tabs">
                    <button
                      type="button"
                      className={loginMethod === "password" ? "tab active" : "tab"}
                      onClick={() => { setLoginMethod("password"); setAuthError(""); setAuthMessage(""); setOtpPreview(""); }}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      className={loginMethod === "otp" ? "tab active" : "tab"}
                      onClick={() => { setLoginMethod("otp"); setAuthError(""); setAuthMessage(""); setOtpPreview(""); }}
                    >
                      Email OTP
                    </button>
                  </div>

                  {loginMethod === "password" ? (
                    <>
                      <label>Password</label>
                      <div className="password-field">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label>OTP Code</label>
                      <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter the OTP from your email" />
                      <div className="otp-actions">
                        <button type="button" className="secondary-button" onClick={handleRequestOtpLogin}>Send OTP</button>
                        <button type="button" onClick={handleVerifyOtpLogin}>Verify &amp; Login</button>
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

            {authError ? <div className="error" style={{ marginTop: "8px" }}>{authError}</div> : null}
            {authMessage ? <div className="success" style={{ marginTop: "8px" }}>{authMessage}</div> : null}
          </div>
        </section>
      </div>
    );
  }

  /* ==========================
     AUTHENTICATED SHELL
     ========================== */
  const topbarTitles = {
    overview: { title: "Overview", subtitle: isAdmin ? "Manage complaints and monitor platform activity." : isWorkerOrLeader ? "Your assigned work at a glance." : "Your complaints and activity." },
    submit: { title: "Submit Complaint", subtitle: "Describe the issue, add photo and location, and we'll take it from there." },
    track: { title: "Track by Complaint ID", subtitle: "Enter an ID to see the status timeline, location, and discussion." },
    history: { title: "History & Archive", subtitle: "Your past complaints with filters." },
    complaints: { title: "Search & Filter Complaints", subtitle: "Combine filters to find complaints instantly." },
    tasks: { title: "My Tasks", subtitle: "Assigned work with deadlines and priorities." },
    progress: { title: "Post a Progress Update", subtitle: "Log progress, attach proof, and mark tasks complete." },
    users: { title: "User Management", subtitle: "Assign roles across Citizen, Worker, Leader, and Admin." },
    controls: { title: "Complaint Controls", subtitle: "Update status, priority, deadlines, and assign work." },
    analytics: { title: "Analytics Dashboard", subtitle: "Volume, resolution times, worker performance and citizen ratings." },
    reports: { title: "Reports & Exports", subtitle: "Category breakdown, resolution rate, and CSV / PDF exports." },
    help: { title: "Help Center", subtitle: "Answers to common questions." }
  };
  const meta = topbarTitles[activeView] || topbarTitles.overview;

  return (
    <div className="app-shell">
      {toast ? (
        <div className="toast-stack">
          <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} />
        </div>
      ) : null}
      <Sidebar
        items={navItems}
        activeView={activeView}
        onSelect={setActiveView}
        user={currentUser}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="app-main">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={currentUser}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          notifications={notifications}
          onToggleNotifications={() => setShowNotifications((v) => !v)}
          onCloseNotifications={() => setShowNotifications(false)}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllRead}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="app-content">
          {/* ===== OVERVIEW ===== */}
          {activeView === "overview" ? (
            <>
              <section className="page-hero">
                <p className="eyebrow">Welcome back</p>
                <h1>Hello, {currentUser.fullName.split(" ")[0]}</h1>
                <p>
                  {isAdmin
                    ? "Keep complaints moving \u2014 assign workers, set deadlines, and track resolution rates."
                    : isWorkerOrLeader
                      ? "Stay on top of your assigned tasks and post updates the moment something changes."
                      : "Report city problems, track progress in real time, and join the discussion."}
                </p>
              </section>

              <section className="card">
                <div className="section-heading">
                  <div>
                    <h3>Your Snapshot</h3>
                    <p className="small muted">A quick look at where things stand.</p>
                  </div>
                  <span className={`pill pill-role pill-role-${roleKey(currentUser.role)}`}>{currentUser.role}</span>
                </div>
                <div className={isWorkerOrLeader && workerDashData ? "dashboard-grid dashboard-grid-6" : "dashboard-grid"}>
                  <div className="dashboard-stat">
                    <span className="stat-label">{isCitizen ? "Your Complaints" : isWorkerOrLeader ? "Total Assigned" : "Total Complaints"}</span>
                    <strong>{isWorkerOrLeader && workerDashData ? workerDashData.stats.totalAssigned : totalComplaints}</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Active</span>
                    <strong>{isWorkerOrLeader && workerDashData ? workerDashData.stats.totalPending : activeComplaintsCount}</strong>
                  </div>
                  {isWorkerOrLeader && workerDashData ? (
                    <>
                      <div className={`dashboard-stat ${workerDashData.stats.overdueCount > 0 ? "dashboard-stat-alert" : ""}`}>
                        <span className="stat-label">Overdue</span>
                        <strong>{workerDashData.stats.overdueCount}</strong>
                      </div>
                      <div className={`dashboard-stat ${workerDashData.stats.dueSoonCount > 0 ? "dashboard-stat-warn" : ""}`}>
                        <span className="stat-label">Due soon</span>
                        <strong>{workerDashData.stats.dueSoonCount}</strong>
                      </div>
                      <div className="dashboard-stat">
                        <span className="stat-label">Completed</span>
                        <strong>{workerDashData.stats.totalCompleted}</strong>
                      </div>
                      <div className="dashboard-stat">
                        <span className="stat-label">Resolved</span>
                        <strong>{workerDashData.stats.totalResolved}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="dashboard-stat">
                        <span className="stat-label">Archived</span>
                        <strong>{archivedComplaints}</strong>
                      </div>
                      <div className="dashboard-stat">
                        <span className="stat-label">Unread alerts</span>
                        <strong>{unreadCount}</strong>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {isAdmin ? (
                <section className="card">
                  <div className="section-heading">
                    <div>
                      <h3>Recent activity</h3>
                      <p className="small muted">Latest complaints across the platform.</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => setActiveView("complaints")}>
                      View all
                    </button>
                  </div>
                  {complaints.slice(0, 3).map((complaint) => renderCard(complaint, { showDiscussion: false }))}
                  {complaints.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icon name="inbox" size={22} /></div>
                      <div className="empty-state-title">Nothing here yet</div>
                      <div className="small muted">When citizens submit complaints, they'll appear here.</div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isWorkerOrLeader && workerDashData ? (
                <section className="card">
                  <div className="section-heading">
                    <div>
                      <h3>Active tasks</h3>
                      <p className="small muted">Tasks currently assigned to you.</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => setActiveView("tasks")}>
                      View all
                    </button>
                  </div>
                  {workerDashData.activeComplaints.slice(0, 3).map((c) => renderCard(c))}
                  {workerDashData.activeComplaints.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icon name="check" size={22} /></div>
                      <div className="empty-state-title">All caught up</div>
                      <div className="small muted">No active tasks right now — great work.</div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isCitizen ? (
                <section className="card">
                  <div className="section-heading">
                    <div>
                      <h3>Quick actions</h3>
                      <p className="small muted">Jump straight into the most common flows.</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setActiveView("submit")}>
                      <Icon name="plus" size={16} /> Submit new complaint
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setActiveView("track")}>
                      <Icon name="map" size={16} /> Track by ID
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setActiveView("history")}>
                      <Icon name="history" size={16} /> View history
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {/* ===== SUBMIT (citizen) ===== */}
          {activeView === "submit" && isCitizen ? (
            <section className="card">
              <h3>Submit a complaint</h3>
              <p className="small muted">Add a clear photo and your location so the issue appears on the map.</p>
              <form onSubmit={handleCreate}>
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={140} placeholder="Short summary of the issue" />

                <label>Description</label>
                <textarea rows={4} value={description} maxLength={MAX_DESCRIPTION} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe when and where the issue occurs, and why it matters…" />
                <div className="small muted char-counter">{description.length}/{MAX_DESCRIPTION}</div>

                <label>Category</label>
                <select value={complaintCategory} onChange={(e) => setComplaintCategory(e.target.value)}>
                  {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <label>Photo (optional, max 5 MB)</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} />
                {photoError ? <div className="error">{photoError}</div> : null}
                {submissionPhotoPreview ? (
                  <div className="photo-preview">
                    <img src={submissionPhotoPreview} alt="Photo preview" />
                    <button type="button" className="secondary-button photo-remove" onClick={() => {
                      setSubmissionPhotoFile(null); setSubmissionPhotoPreview("");
                    }}>Remove photo</button>
                  </div>
                ) : null}

                <label>Location address (optional)</label>
                <input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="e.g., 1 Kuratoli, Dhaka 1229" />

                <div className="location-row">
                  <button type="button" className="secondary-button" onClick={handleUseLocation}>
                    <Icon name="map" size={14} /> Use my current location
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

                <button type="submit" disabled={creating}>
                  {creating ? "Submitting\u2026" : "Create Complaint"}
                </button>
              </form>

              {suggestions.length > 0 ? (
                <div className="suggestions">
                  <h4><Icon name="sparkle" size={16} /> Similar complaints found</h4>
                  <p>Check these records before creating a duplicate.</p>
                  <ul>
                    {suggestions.map((c) => (
                      <li key={c._id} className="suggestion-item">
                        <strong>{c.complaintId}</strong>: {c.title}
                        <div className="suggestion-meta">
                          <span className={statusClass(c.status)}>{c.status}</span>
                          <span className={priorityClass(c.priority)}>{c.priority}</span>
                        </div>
                        <button type="button" className="secondary-button" onClick={async () => {
                          setTrackId(c.complaintId); setTrackError("");
                          try { setTrackedComplaint(await getComplaintStatus(c.complaintId)); setActiveView("track"); }
                          catch (error) { setTrackError(error.message); setTrackedComplaint(null); }
                        }}>View details</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {submitError ? <div className="error" style={{ marginTop: "10px" }}>{submitError}</div> : null}
              {newComplaint ? (
                <div className="success" style={{ marginTop: "10px" }}>
                  Complaint created with ID: <strong className="mono">{newComplaint.complaintId}</strong>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ===== TRACK ===== */}
          {activeView === "track" ? (
            <section className="card">
              <h3>Track by complaint ID</h3>
              <p className="small muted">Enter an ID to see its status timeline, location, and discussion.</p>
              <form onSubmit={handleTrack} className="inline">
                <input placeholder="CMP-YYYYMMDD-XXXXXX" value={trackId} onChange={(e) => setTrackId(e.target.value)} required />
                <button type="submit">Track</button>
              </form>

              {trackError ? <div className="error" style={{ marginTop: "8px" }}>{trackError}</div> : null}

              {trackedComplaint ? (
                <div className="tracked-card">
                  <div className="tracked-header">
                    <div>
                      <div className="mono small muted">{trackedComplaint.complaintId}</div>
                      <div className="history-title">{trackedComplaint.title}</div>
                    </div>
                    <div className="history-top-pills">
                      <span className={statusClass(trackedComplaint.status)}>{trackedComplaint.status}</span>
                      <span className={priorityClass(trackedComplaint.priority)}>{trackedComplaint.priority}</span>
                      {deadlineBadge(trackedComplaint.deadline) ? (
                        <span className={deadlineBadge(trackedComplaint.deadline).className}>
                          {deadlineBadge(trackedComplaint.deadline).label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <StatusTimeline status={trackedComplaint.status} />

                  <div className="small">{trackedComplaint.description || "No description provided."}</div>
                  <div className="small muted">Category: {trackedComplaint.category || "Other"}</div>
                  <div className="small muted">
                    Assigned to:{" "}
                    {trackedComplaint.assignedTo?.fullName
                      ? `${trackedComplaint.assignedTo.fullName} (${trackedComplaint.assignedTo.role})`
                      : "Not assigned yet"}
                  </div>
                  <div className="small muted">Last updated: {formatDate(trackedComplaint.updatedAt)}</div>

                  {trackedComplaint.submissionPhoto ? (
                    <div className="tracked-media">
                      <div className="small">Submitted photo</div>
                      <img src={trackedComplaint.submissionPhoto} alt="Complaint submission" className="complaint-photo" />
                    </div>
                  ) : null}

                  {trackedComplaint.location?.lat != null && trackedComplaint.location?.lng != null ? (
                    <div className="tracked-media">
                      <div className="small">Location on map</div>
                      <ComplaintsMap complaints={[{
                        complaintId: trackedComplaint.complaintId,
                        title: trackedComplaint.title,
                        status: trackedComplaint.status,
                        priority: trackedComplaint.priority,
                        location: trackedComplaint.location
                      }]} />
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
                                <span className={`pill pill-status pill-status-${log.entryType === "completed" ? "resolved" : "progress"}`}>
                                  {log.entryType}
                                </span>
                              </div>
                              <div>{log.text}</div>
                              {log.photoUrl ? <img src={log.photoUrl} alt="Progress attachment" className="complaint-photo thumb" /> : null}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}

                  <FeedbackForm
                    complaint={trackedComplaint}
                    currentUser={currentUser}
                    onSubmitted={handleFeedbackSubmitted}
                  />

                  <div className="tracked-discussion">
                    <InlineComments complaintId={trackedComplaint.complaintId} currentUser={currentUser} />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ===== HISTORY (citizen/worker) ===== */}
          {activeView === "history" && isCitizen ? (
            <section className="card history-archive-card">
              <div className="section-heading">
                <div>
                  <h3>Complaint history &amp; archive</h3>
                  <p className="small muted">Every complaint you've submitted, with filters.</p>
                </div>
                <div className="filter-row">
                  <button type="button" className={historyFilter === "all" ? "tab active" : "tab"} onClick={() => setHistoryFilter("all")}>All</button>
                  <button type="button" className={historyFilter === "active" ? "tab active" : "tab"} onClick={() => setHistoryFilter("active")}>Active</button>
                  <button type="button" className={historyFilter === "archived" ? "tab active" : "tab"} onClick={() => setHistoryFilter("archived")}>Archived</button>
                </div>
              </div>

              {complaints.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="inbox" size={22} /></div>
                  <div className="empty-state-title">No complaints in this view</div>
                  <div className="small muted">Submit a complaint to get started.</div>
                  <button type="button" style={{ marginTop: "10px", width: "auto" }} onClick={() => setActiveView("submit")}>
                    <Icon name="plus" size={14} /> Submit complaint
                  </button>
                </div>
              ) : null}
              {complaints.map((c) => renderCard(c))}
            </section>
          ) : null}

          {/* ===== TASKS (worker) ===== */}
          {activeView === "tasks" && isWorkerOrLeader ? (
            <>
              {workerDashData ? (
                <section className="card">
                  <h3>Task overview</h3>
                  <div className="dashboard-grid dashboard-grid-6">
                    <div className="dashboard-stat">
                      <span className="stat-label">Total Assigned</span>
                      <strong>{workerDashData.stats.totalAssigned}</strong>
                    </div>
                    <div className="dashboard-stat">
                      <span className="stat-label">Active</span>
                      <strong>{workerDashData.stats.totalPending}</strong>
                    </div>
                    <div className={`dashboard-stat ${workerDashData.stats.overdueCount > 0 ? "dashboard-stat-alert" : ""}`}>
                      <span className="stat-label">Overdue</span>
                      <strong>{workerDashData.stats.overdueCount}</strong>
                    </div>
                    <div className={`dashboard-stat ${workerDashData.stats.dueSoonCount > 0 ? "dashboard-stat-warn" : ""}`}>
                      <span className="stat-label">Due soon</span>
                      <strong>{workerDashData.stats.dueSoonCount}</strong>
                    </div>
                    <div className="dashboard-stat">
                      <span className="stat-label">Completed</span>
                      <strong>{workerDashData.stats.totalCompleted}</strong>
                    </div>
                    <div className="dashboard-stat">
                      <span className="stat-label">Resolved</span>
                      <strong>{workerDashData.stats.totalResolved}</strong>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="card">
                <h3>Active tasks</h3>
                {workerDashData && workerDashData.activeComplaints.length > 0 ? (
                  workerDashData.activeComplaints.map((c) => renderCard(c))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="check" size={22} /></div>
                    <div className="empty-state-title">All caught up</div>
                    <div className="small muted">No active tasks right now — great work.</div>
                  </div>
                )}
              </section>

              {workerDashData && workerDashData.completedComplaints.length > 0 ? (
                <section className="card">
                  <h3>Recently completed</h3>
                  {workerDashData.completedComplaints.slice(0, 8).map((c) => renderCard(c, { showDiscussion: false }))}
                </section>
              ) : null}
            </>
          ) : null}

          {/* ===== WORKER PROGRESS POST ===== */}
          {activeView === "progress" && isWorkerOrLeader ? (
            <section className="card">
              <h3>Post a progress update</h3>
              <p className="small muted">Describe what you did on site, optionally attach a photo, and mark the task complete when finished.</p>

              {complaints.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="inbox" size={22} /></div>
                  <div className="empty-state-title">No complaints assigned yet</div>
                  <div className="small muted">You'll see active tasks here when an admin assigns them to you.</div>
                </div>
              ) : (
                <>
                  <label>Assigned complaint</label>
                  <select value={workComplaintId} onChange={(e) => setWorkComplaintId(e.target.value)}>
                    {complaints.map((c) => (
                      <option key={c._id} value={c.complaintId}>{c.complaintId} — {c.title}</option>
                    ))}
                  </select>

                  <label>Update details</label>
                  <textarea rows={4} value={workUpdateText} onChange={(e) => setWorkUpdateText(e.target.value)} placeholder="Describe what you did on site…" />

                  <label>Photo proof (optional, max 5 MB)</label>
                  <input type="file" accept="image/*" onChange={(e) => setWorkPhotoFile(e.target.files?.[0] || null)} />

                  <div className="worker-actions">
                    <button type="button" onClick={() => submitWorkerUpdate({ markCompleted: false })}>
                      <Icon name="upload" size={14} /> Submit update
                    </button>
                    <button type="button" className="secondary-button" onClick={() => submitWorkerUpdate({ markCompleted: true })}>
                      <Icon name="check" size={14} /> Mark task complete
                    </button>
                  </div>
                </>
              )}

              {workMessage ? <div className="small" style={{ marginTop: "10px" }}>{workMessage}</div> : null}
            </section>
          ) : null}

          {/* ===== COMPLAINTS (search + filter + history) — Admin, Leader, Worker ===== */}
          {activeView === "complaints" && (isAdminOrLeader || isWorker) ? (
            <>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h3>Search &amp; filter</h3>
                    <p className="small muted">Combine filters to find complaints instantly.</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setShowFilterPanel(!showFilterPanel)}>
                    <Icon name="filter" size={14} /> {showFilterPanel ? "Hide" : "Show"} filters
                  </button>
                </div>

                {activeFilterChips.length > 0 ? (
                  <div className="filter-chips">
                    {activeFilterChips.map((chip) => (
                      <button type="button" key={chip.label} className="chip" onClick={chip.clear}>
                        {chip.label} ×
                      </button>
                    ))}
                    <button type="button" className="chip chip-clear" onClick={handleClearFilters}>Clear all</button>
                  </div>
                ) : null}

                {showFilterPanel ? (
                  <form onSubmit={handleFilterSearch} className="filter-form">
                    <div className="filter-grid">
                      <div>
                        <label>Status</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                          <option value="">All</option>
                          {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Category</label>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                          <option value="">All</option>
                          {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Priority</label>
                        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                          <option value="">All</option>
                          {PRIORITY_VALUES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Area / Location</label>
                        <input value={filterArea} onChange={(e) => setFilterArea(e.target.value)} placeholder="e.g., Dhaka" />
                      </div>
                      <div>
                        <label>Date from</label>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                      </div>
                      <div>
                        <label>Date to</label>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                      </div>
                      {isWorker ? null : (
                        <div>
                          <label>Assignee</label>
                          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                            <option value="">Anyone</option>
                            <option value="unassigned">Unassigned</option>
                            {users.filter((u) => ["Worker", "Leader"].includes(u.role)).map((u) => (
                              <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <label>Keyword</label>
                    <input value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} placeholder="Search titles and descriptions…" />

                    <div className="filter-actions">
                      <button type="submit"><Icon name="search" size={14} /> Search</button>
                      <button type="button" className="secondary-button" onClick={handleClearFilters}>Clear</button>
                    </div>
                  </form>
                ) : null}

                {filterMessage ? <div className="small" style={{ marginTop: "10px" }}>{filterMessage}</div> : null}

                {filterRan && filterResults.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="search" size={22} /></div>
                    <div className="empty-state-title">No matching complaints</div>
                    <div className="small muted">Try adjusting or clearing some filters.</div>
                  </div>
                ) : null}

                {filterResults.length > 0 ? (
                  <div className="filter-results">
                    {filterResults.map((c) => renderCard(c))}
                  </div>
                ) : null}
              </section>

              <section className="card history-archive-card">
                <div className="section-heading">
                  <div>
                    <h3>All complaints</h3>
                    <p className="small muted">Full list. Expand a card to join the discussion.</p>
                  </div>
                  <div className="filter-row">
                    <button type="button" className={historyFilter === "all" ? "tab active" : "tab"} onClick={() => setHistoryFilter("all")}>All</button>
                    <button type="button" className={historyFilter === "active" ? "tab active" : "tab"} onClick={() => setHistoryFilter("active")}>Active</button>
                    <button type="button" className={historyFilter === "archived" ? "tab active" : "tab"} onClick={() => setHistoryFilter("archived")}>Archived</button>
                  </div>
                </div>

                {complaints.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="inbox" size={22} /></div>
                    <div className="empty-state-title">No complaints in this view</div>
                  </div>
                ) : null}
                {complaints.map((c) => renderCard(c))}
              </section>
            </>
          ) : null}

          {/* ===== ADMIN: USERS ===== */}
          {activeView === "users" && isAdmin ? (
            <section className="card">
              <h3>User management</h3>
              <p className="small muted">Assign roles as Citizen, Worker, Leader, or Admin for any registered user.</p>
              {userAdminMessage ? <div className="small" style={{ marginBottom: "8px" }}>{userAdminMessage}</div> : null}
              {users.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="users" size={22} /></div>
                  <div className="empty-state-title">No users available</div>
                </div>
              ) : null}
              <div className="user-list">
                {users.map((user) => (
                  <article key={user.id} className="user-item">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div className={`avatar avatar-${roleKey(user.role)}`}>{user.fullName?.[0]?.toUpperCase() || "U"}</div>
                      <div>
                        <strong>{user.fullName}</strong>
                        <div className="small muted">{user.email || user.phone || "No contact info"}</div>
                        <div className="small">
                          <span className={`pill pill-role pill-role-${roleKey(user.role)}`}>{user.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="user-actions">
                      <select
                        value={roleSelections[user.id] || user.role}
                        onChange={(e) => setRoleSelections((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      >
                        {ROLE_ASSIGN_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button type="button" onClick={() => handleRoleUpdate(user.id)}>Save</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* ===== CONTROLS (Admin full, Leader: assign + deadline) ===== */}
          {activeView === "controls" && isAdminOrLeader ? (
            <>
              <section className="card">
                <h3>Complaint controls</h3>
                <p className="small muted">
                  {isAdmin
                    ? "Update status, priority, or deadline for any complaint by ID."
                    : "Set or update the SLA deadline for a complaint assigned to you."}
                </p>
                <label>Complaint ID</label>
                <input value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="CMP-YYYYMMDD-XXXXXX" />

                <div className="admin-action-grid">
                  {isAdmin ? (
                    <form onSubmit={handleAdminUpdate} className="admin-action">
                      <label>New status</label>
                      <select value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                        {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button type="submit">Update status</button>
                    </form>
                  ) : null}

                  {isAdmin ? (
                    <form onSubmit={handlePriorityUpdate} className="admin-action">
                      <label>Priority</label>
                      <select value={adminPriority} onChange={(e) => setAdminPriority(e.target.value)}>
                        {PRIORITY_VALUES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button type="submit">Update priority</button>
                    </form>
                  ) : null}

                  <form onSubmit={handleDeadlineUpdate} className="admin-action">
                    <label>Deadline</label>
                    <input type="date" value={adminDeadline} onChange={(e) => setAdminDeadline(e.target.value)} />
                    <button type="submit">Save deadline</button>
                  </form>
                </div>
                {adminMessage ? <div className="small" style={{ marginTop: "10px" }}>{adminMessage}</div> : null}
              </section>

              <section className="card">
                <h3>{isLeader ? "Assign to a worker" : "Assign to a leader"}</h3>
                <p className="small muted">
                  {isLeader
                    ? "Route a complaint assigned to you forward to a specific worker, and optionally set a deadline."
                    : "Route a complaint to a Leader, who will then delegate it to the right worker."}
                </p>
                <form onSubmit={handleAssignComplaint}>
                  <label>Complaint ID</label>
                  <input value={adminId} onChange={(e) => setAdminId(e.target.value)} required />

                  <label>Assignee</label>
                  <select value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)} required>
                    <option value="" disabled>{isLeader ? "Select a worker" : "Select a leader"}</option>
                    {users
                      .filter((u) => (isLeader ? u.role === "Worker" : u.role === "Leader"))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                      ))}
                  </select>

                  <label>Deadline (optional)</label>
                  <input type="date" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} />

                  <button type="submit" disabled={!assigneeUserId}>
                    <Icon name="send" size={14} /> Assign complaint
                  </button>
                </form>
                {assignMessage ? <div className="small" style={{ marginTop: "10px" }}>{assignMessage}</div> : null}
                {users.filter((u) => (isLeader ? u.role === "Worker" : u.role === "Leader")).length === 0 ? (
                  <div className="small muted" style={{ marginTop: "10px" }}>
                    {isLeader
                      ? "No Worker users are available yet. Ask an Admin to promote accounts under Users."
                      : "No Leader users yet. Promote accounts to Leader under Users first."}
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          {/* ===== ANALYTICS — Admin, Leader ===== */}
          {activeView === "analytics" && isAdminOrLeader ? (
            <section className="card">
              <div className="section-heading">
                <div>
                  <h3>Analytics dashboard</h3>
                  <p className="small muted">Platform health across volume, resolution times, and citizen satisfaction.</p>
                </div>
                <div className="export-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                  >
                    <Icon name="download" size={14} /> CSV
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleExport("pdf")}
                    disabled={exporting}
                  >
                    <Icon name="download" size={14} /> PDF
                  </button>
                </div>
              </div>
              <AnalyticsDashboard
                data={analyticsData}
                onRefresh={() => loadAnalytics()}
                loading={analyticsLoading}
              />
            </section>
          ) : null}

          {activeView === "reports" && isAdminOrLeader ? (
            <section className="card">
              <div className="section-heading">
                <div>
                  <h3>Category-wise reports</h3>
                  <p className="small muted">Breakdown of complaints by category with resolution statistics.</p>
                </div>
                <div className="export-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                  >
                    <Icon name="download" size={14} /> Export CSV
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleExport("pdf")}
                    disabled={exporting}
                  >
                    <Icon name="download" size={14} /> Export PDF
                  </button>
                  <button type="button" className="secondary-button" onClick={() => loadCategoryReports()}>
                    Refresh
                  </button>
                </div>
              </div>

              {filterRan ? (
                <div className="small muted" style={{ marginBottom: 8 }}>
                  Exports use the filters you applied in <strong>Complaints</strong>.
                </div>
              ) : null}

              <CategoryReportsChart reports={categoryReports} />

              {categoryReports.length > 0 ? (
                <div className="category-reports-table-wrap">
                  <table className="category-reports-table">
                    <thead>
                      <tr>
                        <th>Category</th><th>Total</th><th>Pending</th><th>Assigned</th>
                        <th>In Progress</th><th>Resolved</th><th>Rejected</th><th>Resolution %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryReports.map((r) => (
                        <tr key={r.category}>
                          <td>{r.category}</td>
                          <td><strong>{r.total}</strong></td>
                          <td>{r.pending}</td>
                          <td>{r.assigned}</td>
                          <td>{r.inProgress}</td>
                          <td>{r.resolved}</td>
                          <td>{r.rejected}</td>
                          <td>
                            <div className="resolution-bar-wrap">
                              <div className="resolution-bar" style={{ width: `${r.resolutionRate}%` }} />
                              <span>{r.resolutionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="chart" size={22} /></div>
                  <div className="empty-state-title">No data available yet</div>
                  <div className="small muted">Reports populate as citizens submit complaints.</div>
                </div>
              )}
            </section>
          ) : null}

          {/* ===== HELP ===== */}
          {activeView === "help" ? (
            <section className="card">
              <h3>Help Center</h3>
              <p className="small muted">Answers to the most common questions about ComplaintHub.</p>
              <FaqAccordion items={isAdmin ? FAQ_ADMIN : isWorkerOrLeader ? FAQ_WORKER : FAQ_CITIZEN} />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
