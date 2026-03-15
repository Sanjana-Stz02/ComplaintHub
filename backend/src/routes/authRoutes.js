import { Router } from "express";
import {
	getUsers,
	login,
	requestLoginOtp,
	signUp,
	updateUserRole,
	verifyLoginOtp
} from "../controllers/authController.js";

const router = Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/login/request-otp", requestLoginOtp);
router.post("/login/verify-otp", verifyLoginOtp);
router.get("/users", getUsers);
router.patch("/users/:userId/role", updateUserRole);

export default router;