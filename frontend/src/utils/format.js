export const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

export const formatDateShort = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString();
};

export const priorityClass = (priority) => {
  switch (priority) {
    case "Emergency":
      return "pill pill-priority pill-emergency";
    case "High":
      return "pill pill-priority pill-high";
    case "Medium":
      return "pill pill-priority pill-medium";
    case "Low":
    default:
      return "pill pill-priority pill-low";
  }
};

export const statusClass = (status) => {
  switch (status) {
    case "Pending":
      return "pill pill-status pill-status-pending";
    case "Assigned":
      return "pill pill-status pill-status-assigned";
    case "In Progress":
      return "pill pill-status pill-status-progress";
    case "Resolved":
      return "pill pill-status pill-status-resolved";
    case "Rejected":
      return "pill pill-status pill-status-rejected";
    default:
      return "pill pill-status";
  }
};

const STATUS_ORDER = ["Pending", "Assigned", "In Progress", "Resolved"];

export const statusStepIndex = (status) => {
  if (status === "Rejected") {
    return -1;
  }

  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? 0 : index;
};

export const STATUS_STEPS = STATUS_ORDER;

export const daysUntil = (deadline) => {
  if (!deadline) {
    return null;
  }

  const due = new Date(deadline);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dueStart = new Date(due);
  dueStart.setHours(0, 0, 0, 0);
  return Math.round((dueStart.getTime() - todayStart.getTime()) / msPerDay);
};

export const deadlineBadge = (deadline) => {
  const days = daysUntil(deadline);

  if (days === null) {
    return null;
  }

  if (days < 0) {
    return {
      label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
      className: "pill pill-deadline pill-overdue"
    };
  }

  if (days === 0) {
    return { label: "Due today", className: "pill pill-deadline pill-due-soon" };
  }

  if (days <= 3) {
    return {
      label: `Due in ${days} day${days === 1 ? "" : "s"}`,
      className: "pill pill-deadline pill-due-soon"
    };
  }

  return {
    label: `Due ${new Date(deadline).toLocaleDateString()}`,
    className: "pill pill-deadline pill-due-ok"
  };
};

export const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
