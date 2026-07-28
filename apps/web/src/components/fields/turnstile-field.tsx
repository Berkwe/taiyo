import { Turnstile } from "@marsidev/react-turnstile"
import { cn } from "@taiyomoe/ui/utils/cn"
import {
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form"
import { env } from "~/env"

export const TurnstileField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  className,
  ...props
}: Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  className?: string
}) => {
  const { field } = useController(props)
  const siteKey =
    process.env.NODE_ENV !== "production" &&
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "disabled"
      ? "1x00000000000000000000AA"
      : env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return (
    <Turnstile
      className={cn("min-h-20", className)}
      siteKey={siteKey}
      onSuccess={(token) => field.onChange(token)}
      options={{ size: "flexible" }}
    />
  )
}
