import { create } from "zustand"

const steps = [
  "form",
  "verificationEmailSent",
  "forgotPassword",
  "resetPasswordEmailSent",
] as const

type State = {
  page: number
  direction: -1 | 1
  signInDraft: {
    email: string
    password: string
    rememberMe: boolean
  }
  signUpDraft: {
    username: string
    email: string
    password: string
    confirmPassword: string
  }
  forgotPasswordEmail: string

  goToForm: () => void
  goToStep: (step: (typeof steps)[number]) => void
  reset: () => void
  setForgotPasswordEmail: (email: string) => void
  setSignInDraft: (draft: State["signInDraft"]) => void
  setSignUpDraft: (draft: State["signUpDraft"]) => void
}

const initialState = {
  page: 0,
  direction: -1,
  signInDraft: {
    email: "",
    password: "",
    rememberMe: true,
  },
  signUpDraft: {
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
  forgotPasswordEmail: "",
} satisfies Pick<
  State,
  "page" | "direction" | "signInDraft" | "signUpDraft" | "forgotPasswordEmail"
>

export const useAuthStore = create<State>((set) => ({
  ...initialState,
  goToForm: () => set({ page: 0, direction: -1 }),
  goToStep: (step) =>
    set((prev) => ({
      page: steps.indexOf(step),
      direction: steps.indexOf(step) > prev.page ? 1 : -1,
    })),
  reset: () => set(initialState),
  setForgotPasswordEmail: (forgotPasswordEmail) => set({ forgotPasswordEmail }),
  setSignInDraft: (signInDraft) => set({ signInDraft }),
  setSignUpDraft: (signUpDraft) => set({ signUpDraft }),
}))
