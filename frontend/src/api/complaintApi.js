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
