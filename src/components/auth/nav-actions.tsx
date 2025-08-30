"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"

export default function NavActions() {
  const { data: session } = useSession()
  const [isMounted, setIsMounted] = useState(false)

  // Ensure the component is mounted before rendering
  useEffect(() => {
    setIsMounted(true)
    console.log(session);
  }, [])

  if (!isMounted) {
    return null // Prevent rendering on the server
  }

  return session ? (
    <Link href="/meet">
      <Button>Open App</Button>
    </Link>
  ) : (
    <div className="flex items-center gap-2">
      <Button variant="ghost" onClick={() => signIn()}>Log in</Button>
    </div>
  )
}