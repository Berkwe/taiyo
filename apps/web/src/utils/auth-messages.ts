export const authMessages = {
  USER_NOT_FOUND: "auth.errors.userNotFound",
  USER_ALREADY_EXISTS: "auth.errors.emailAlreadyExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "auth.errors.emailAlreadyExists",
  USERNAME_IS_ALREADY_TAKEN: "auth.errors.usernameAlreadyExists",
  USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER:
    "auth.errors.usernameAlreadyExists",
  INVALID_EMAIL: "auth.errors.invalidEmail",
  UNSUPPORTED_EMAIL_PROVIDER: "auth.errors.invalidEmail",
  USERNAME_IS_INVALID: "auth.errors.invalidUsername",
  INVALID_EMAIL_OR_PASSWORD: "auth.errors.invalidEmailOrPassword",
  INVALID_USERNAME_OR_PASSWORD: "auth.errors.invalidUsernameOrPassword",
  EMAIL_NOT_VERIFIED: "auth.errors.emailNotVerified",
  VERIFICATION_EMAIL_ALREADY_SENT: "auth.errors.verificationEmailAlreadySent",
  EMAIL_DELIVERY_FAILED: "auth.errors.emailDeliveryFailed",
  INVALID_TOKEN: "auth.errors.invalidToken",
} as const
