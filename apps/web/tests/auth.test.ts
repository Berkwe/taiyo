import assert from "node:assert/strict"
import test from "node:test"
import {
  signInEmailSchema,
  signInUsernameSchema,
  signUpSchema,
} from "../src/schemas/users.schemas.ts"

test("normal email sign-in does not depend on a captcha token", () => {
  const result = signInEmailSchema.safeParse({
    email: "reader@example.com",
    password: "correct-horse",
    rememberMe: true,
  })
  assert.equal(result.success, true)
})

test("normal username sign-in does not depend on a captcha token", () => {
  const result = signInUsernameSchema.safeParse({
    username: "novora_reader",
    password: "correct-horse",
    rememberMe: false,
  })
  assert.equal(result.success, true)
})

test("normal sign-in still rejects missing credentials", () => {
  assert.equal(
    signInEmailSchema.safeParse({
      email: "reader@example.com",
      rememberMe: true,
    }).success,
    false,
  )
})

test("registration requires an independently entered matching confirmation", () => {
  const valid = {
    username: "novora_reader",
    email: "reader@example.com",
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
