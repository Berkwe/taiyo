import type { InferNestedPaths } from "@taiyomoe/types"
import { ArrowRightIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { SubmitButton } from "~/components/ui/submit-button"

type Props = { label: InferNestedPaths<IntlMessages["auth"]> }

export const AuthSubmitButton = ({ label }: Props) => {
  const t = useTranslations()

  return (
    <SubmitButton className="mt-6 hover:[&_svg]:translate-x-1">
      {t(`auth.${label}`)}
      <ArrowRightIcon />
    </SubmitButton>
  )
}
