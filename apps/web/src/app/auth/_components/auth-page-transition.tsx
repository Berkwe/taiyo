"use client"

import { motion } from "motion/react"
import type { PropsWithChildren } from "react"

export function AuthPageTransition({ children }: PropsWithChildren) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex w-full flex-col items-center gap-8 md:gap-14"
      initial={{ opacity: 0, scale: 0.99, y: 8 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
