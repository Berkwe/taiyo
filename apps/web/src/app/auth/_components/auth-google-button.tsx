import { authClient } from "@taiyomoe/auth/client"
import { GoogleButton } from "~/components/ui/google-button"

export const AuthGoogleButton = ({
  callbackURL = "/tr",
}: {
  callbackURL?: string
}) => {
  const handlePress = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/auth/error",
    })
  }

  return <GoogleButton onClick={handlePress} />
}
