import Image from "next/image"
import Link from "next/link"
import { MissingToken } from "./_components/missing-token"
import { ResetPasswordForm } from "./_components/reset-password-form"

type Props = {
  searchParams: Promise<{ token: string }>
}
export default async function Page(props: Props) {
  const searchParams = await props.searchParams

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-subtle p-4 md:gap-14 md:py-12 dark:bg-default">
      <Link href="/" className="flex max-w-full items-center gap-2">
        <Image
          alt=""
          className="size-14 shrink-0 rounded-xl object-cover sm:size-20"
          height={80}
          priority
          src="/assets/brand/novora-brand-mark.svg"
          width={80}
        />
        <h2 className="font-bold text-2xl tracking-tight sm:text-4xl">
          NovoraScans
        </h2>
      </Link>
      {searchParams.token && <ResetPasswordForm token={searchParams.token} />}
      {!searchParams.token && <MissingToken />}
    </main>
  )
}
