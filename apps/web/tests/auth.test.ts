import assert from "node:assert/strict"
import test from "node:test"
import { isAllowedEmailDomain } from "@taiyomoe/utils"
import {
  signInEmailSchema,
  signUpSchema,
} from "../src/schemas/users.schemas.ts"
import { authMessages } from "../src/utils/auth-messages.ts"

test("normal email sign-in does not depend on a captcha token", () => {
  const result = signInEmailSchema.safeParse({
    email: "reader@gmail.com",
    password: "correct-horse",
    rememberMe: true,
  })
  assert.equal(result.success, true)
})

test("normal sign-in still rejects missing credentials", () => {
  assert.equal(
    signInEmailSchema.safeParse({
      email: "reader@gmail.com",
      rememberMe: true,
    }).success,
    false,
  )
})

test("registration requires an independently entered matching confirmation", () => {
  const valid = {
    username: "novora_reader",
    email: "reader@gmail.com",
    password: "Correct-horse1!",
    turnstileToken: "test-token",
  }
  assert.equal(
    signUpSchema.safeParse({ ...valid, confirmPassword: "" }).success,
    false,
  )
  assert.equal(
    signUpSchema.safeParse({
      ...valid,
      confirmPassword: "Different-horse1!",
    }).success,
    false,
  )
  assert.equal(
    signUpSchema.safeParse({
      ...valid,
      confirmPassword: valid.password,
    }).success,
    true,
  )
})

test("temporary and unknown email providers are rejected", () => {
  assert.equal(
    signUpSchema.safeParse({
      username: "novora_reader",
      email: "reader@temporary.example",
      password: "Correct-horse1!",
      confirmPassword: "Correct-horse1!",
      turnstileToken: "test-token",
    }).success,
    false,
  )
})

test("permanent email whitelist accepts major providers", () => {
  for (const email of [
    "reader@gmail.com",
    "reader@outlook.com",
    "reader@proton.me",
    "reader@protonmail.com",
    "reader@protonmail.ch",
    "reader@pm.me",
    "reader@icloud.com",
    "reader@yahoo.com",
  ]) {
    assert.equal(isAllowedEmailDomain(email), true)
  }

  assert.equal(isAllowedEmailDomain("reader@mailinator.com"), false)
  assert.equal(isAllowedEmailDomain("reader@temporary.example"), false)
})

test("duplicate usernames have a localized auth error mapping", () => {
  assert.equal(
    authMessages.USERNAME_IS_ALREADY_TAKEN,
    "auth.errors.usernameAlreadyExists",
  )
  assert.equal(
    authMessages.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL,
    "auth.errors.emailAlreadyExists",
  )
})
