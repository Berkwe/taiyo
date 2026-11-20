import Image from "next/image"
import Link from "next/link"
import { AuthPageTransition } from "../_components/auth-page-transition"
import { MissingToken } from "./_components/missing-token"
import { ResetPasswordForm } from "./_components/reset-password-form"

type Props = {
  searchParams: Promise<{ token: string }>
}
export default async function Page(props: Props) {
  const searchParams = await props.searchParams

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-subtle p-4 md:gap-14 md:py-12 dark:bg-default">
      <AuthPageTransition>
        <Link href="/" aria-label="NovoraScans ana sayfa">
          <Image
            alt="NovoraScans"
            className="h-auto w-44 object-contain sm:w-56"
            height={941}
            priority
            src="/assets/brand/novora-stacked-logo.png"
            width={1672}
          />
        </Link>
        {searchParams.token && <ResetPasswordForm token={searchParams.token} />}
        {!searchParams.token && <MissingToken />}
      </AuthPageTransition>
    </main>
  )
}
