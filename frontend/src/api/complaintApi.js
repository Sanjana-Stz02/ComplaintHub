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

export const updateComplaintStatus = async (complaintId, status) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const updateComplaintPriority = async (complaintId, priority) => {
  const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ priority })
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