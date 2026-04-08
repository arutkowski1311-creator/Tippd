"use client";

import { useState } from "react";
import Link from "next/link";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Contractor Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to manage your dumpster rentals
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-tippd-blue focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-tippd-blue focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="w-full h-10 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/portal/signup"
            className="text-tippd-blue hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
