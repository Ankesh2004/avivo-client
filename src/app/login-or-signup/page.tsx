"use client"
import { signIn, useSession } from "next-auth/react"

export default function Login() {
  const { data: session } = useSession()

  if (session) {
    return (
      <main className="mx-auto max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Already signed in</h1>
        <a href="/" className="inline-block rounded-2xl border px-4 py-2">
          Go Home
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-center text-2xl font-semibold">Sign in</h1>
        <div className="space-y-3">
          {/* Call next-auth's signIn directly */}
          <button
            onClick={(e) => {e.preventDefault(); signIn("google", { callbackUrl: 'http://localhost:3000' })}}
            className="w-full rounded-2xl border px-4 py-2"
          >
            Continue with Google
          </button>
          <button
            onClick={(e) => {e.preventDefault(); signIn("github", { callbackUrl: 'http://localhost:3000' })}}
            className="w-full rounded-2xl border px-4 py-2"
          >
            Continue with GitHub
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </main>
  )
}
