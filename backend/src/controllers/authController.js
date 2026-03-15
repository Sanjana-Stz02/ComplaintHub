import { User } from "../models/User.js";
import nodemailer from "nodemailer";

const DEFAULT_ADMIN_EMAIL = "adminus@elonmusk.com";
const DEFAULT_ADMIN_PASSWORD = "we_the_people";
const DEFAULT_ADMIN_NAME = "Default Admin";
const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;

const isValidEmail = (value) => /^(?!\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i.test(value);
const isValidPhone = (value) => /^\+?[0-9]{10,15}$/.test(value);

const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = identifier.trim();
  const query = normalizedIdentifier.includes("@")
    ? { email: normalizedIdentifier.toLowerCase() }
    : { phone: normalizedIdentifier };

  const user = await User.findOne(query);
  return { user, query, normalizedIdentifier };
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  lastLoginAt: user.lastLoginAt
});

const getEmailTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const sendLoginOtpEmail = async ({ email, fullName, otpCode }) => {
  const transporter = getEmailTransporter();

  if (!transporter) {
    return false;
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: "ComplaintHub Login OTP",
    text: `Hello ${fullName || "User"}, your ComplaintHub login OTP is ${otpCode}. It will expire in 5 minutes.`,
    html: `<p>Hello ${fullName || "User"},</p><p>Your ComplaintHub login OTP is <strong>${otpCode}</strong>.</p><p>This code will expire in 5 minutes.</p>`
  });

  return true;
};

const getAdminRequester = async (requesterId) => {
  if (!requesterId) {
    return null;
  }

  const requester = await User.findById(requesterId);

  if (!requester || !["Admin", "Super Admin"].includes(requester.role)) {
    return null;
  }

  return requester;
};

export const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (!existingAdmin) {
    await User.create({
      fullName: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      role: "Admin"
    });
    return;
  }

  let shouldSave = false;

  if (existingAdmin.role !== "Admin") {
    existingAdmin.role = "Admin";
    shouldSave = true;
  }

  if (!existingAdmin.password) {
    existingAdmin.password = DEFAULT_ADMIN_PASSWORD;
    shouldSave = true;
  }

  if (shouldSave) {
    await existingAdmin.save();
  }
};

export const signUp = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Full name, email, and password are required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (phone?.trim() && !isValidPhone(phone.trim())) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone?.trim() || undefined;

    const existingEmail = await User.findOne({ email: normalizedEmail });

    if (existingEmail) {
      return res.status(409).json({ message: "An account already exists with this email." });
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });

      if (existingPhone) {
        return res.status(409).json({ message: "An account already exists with this phone number." });
      }
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: password.trim(),
      role: "Citizen"
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create account.", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Email or phone and password are required." });
    }

    const { user } = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.password !== password.trim()) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    user.lastLoginAt = new Date();

    await user.save();

    return res.status(200).json({
      message: "Login successful.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to log in.", error: error.message });
  }
};

export const requestLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required for OTP login." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found for this email." });
    }

    const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    user.loginOtpCode = otpCode;
    user.loginOtpExpiresAt = new Date(Date.now() + LOGIN_OTP_TTL_MS);
    await user.save();

    const emailSent = await sendLoginOtpEmail({
      email: user.email,
      fullName: user.fullName,
      otpCode
    });

    if (!emailSent) {
      return res.status(200).json({
        message: "SMTP is not configured. Using demo OTP preview for local testing.",
        otpPreview: otpCode,
        demoMode: true
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email. Please verify to continue login."
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send login OTP.", error: error.message });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "No account found for this email." });
    }

    if (!user.loginOtpCode || !user.loginOtpExpiresAt) {
      return res.status(400).json({ message: "No active OTP found. Request a new OTP." });
    }

    if (user.loginOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Request a new OTP." });
    }

    if (user.loginOtpCode !== otp.trim()) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    user.loginOtpCode = null;
    user.loginOtpExpiresAt = null;
    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "OTP login successful.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify OTP.", error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { requesterId } = req.query;
    const requester = await getAdminRequester(requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins can view users." });
    }

    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("fullName email phone role lastLoginAt createdAt");

    return res.status(200).json(users.map((user) => sanitizeUser(user)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId, role } = req.body;

    const requester = await getAdminRequester(requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins can update user roles." });
    }

    if (!["Citizen", "Worker", "MP", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be Citizen, Worker, MP, or Admin." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `${user.fullName} is now ${role}.`,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user role.", error: error.message });
  }
};

export const getDefaultAdminCredentials = () => ({
  email: DEFAULT_ADMIN_EMAIL,
  password: DEFAULT_ADMIN_PASSWORD
});