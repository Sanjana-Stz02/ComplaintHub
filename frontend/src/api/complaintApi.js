const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseError = async (response) => {
  const payload = await response.json().catch(() => ({}));
  return payload.message || "Request failed";
};

export const createComplaint = async (data) => {
  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getComplaintStatus = async (complaintId) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const updateComplaintStatus = async (complaintId, status, adminId) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status, adminId })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const updateComplaintPriority = async (complaintId, priority, adminId) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ priority, adminId })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getAllComplaints = async () => {
  const response = await fetch(`${API_BASE_URL}/complaints`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const searchComplaints = async (query) => {
  const response = await fetch(`${API_BASE_URL}/complaints/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getComplaintHistory = async ({ userId, role, archived }) => {
  const params = new URLSearchParams();

  if (userId) {
    params.set("userId", userId);
  }

  if (role) {
    params.set("role", role);
  }

  if (archived !== undefined) {
    params.set("archived", `${archived}`);
  }

  const response = await fetch(`${API_BASE_URL}/complaints/history?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const signUp = async (data) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const login = async (data) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const requestLoginOtp = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/login/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const verifyLoginOtp = async ({ email, otp }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getUsers = async (requesterId) => {
  const response = await fetch(`${API_BASE_URL}/auth/users?requesterId=${encodeURIComponent(requesterId)}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const assignComplaint = async (complaintId, { adminId, assigneeUserId, deadline }) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/assign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ adminId, assigneeUserId, deadline })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const updateComplaintDeadline = async (complaintId, { adminId, deadline }) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/deadline`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ adminId, deadline })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const addProgressUpdate = async (complaintId, { workerId, text, photoUrl, markCompleted }) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ workerId, text, photoUrl, markCompleted })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const updateUserRole = async ({ requesterId, userId, role }) => {
  const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ requesterId, role })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const filterComplaints = async (params) => {
  const query = new URLSearchParams();

  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.priority) query.set("priority", params.priority);
  if (params.area) query.set("area", params.area);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.assignee) query.set("assignee", params.assignee);

  const response = await fetch(`${API_BASE_URL}/complaints/filter?${query.toString()}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const addComment = async (complaintId, { userId, text }) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userId, text })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getComments = async (complaintId) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(complaintId)}/comments`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getCategoryReports = async () => {
  const response = await fetch(`${API_BASE_URL}/complaints/category-reports`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getWorkerDashboard = async (workerId) => {
  const response = await fetch(`${API_BASE_URL}/complaints/worker-dashboard?workerId=${encodeURIComponent(workerId)}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getNotifications = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/notifications?userId=${encodeURIComponent(userId)}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const markNotificationRead = async (notificationId) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const markAllNotificationsRead = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};