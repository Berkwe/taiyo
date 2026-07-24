import Image from "next/image"
import Link from "next/link"
import { SignInFlow } from "./_components/sign-in-flow"

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-subtle p-4 md:gap-14 md:py-12 dark:bg-default">
      <Link href="/" className="flex items-center gap-2">
        <Image
          alt=""
          className="size-20 rounded-xl object-cover"
          height={80}
          priority
          src="/novorascans-logo.png"
          width={80}
        />
        <h1 className="font-bold text-4xl tracking-tight">NovoraScans</h1>
      </Link>
      <SignInFlow />
    </main>
  )
}
