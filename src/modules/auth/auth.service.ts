import bcrypt from "bcrypt";
import { databasePool } from "../../database/connection";
import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/token";
import { LoginInput, LoginResponse } from "./auth.types";

export const loginService = async (
  input: LoginInput,
): Promise<LoginResponse> => {
  const result = await databasePool.query(
    `SELECT id, email, password, role, is_active
     FROM users
     WHERE email = $1`,
    [input.email],
  );

  const user = result.rows[0];

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.is_active) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  const isMatch = await bcrypt.compare(input.password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};
