"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Target,
  FileText,
  Route,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function HomePage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        console.error("Google sign in error:", error);
        setIsGoogleLoading(false);
      }
      // On success, redirect happens automatically.
    } catch (err) {
      console.error("Failed to sign in with Google:", err);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-slate-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 border-b border-black/5 bg-[#f7f5f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            PathForge
          </Link>

          <div className="flex items-center gap-10 text-sm md:text-base">
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900">
              How it works
            </a>
            <a href="#product" className="text-slate-600 hover:text-slate-900">
              Product
            </a>
            <a href="#roadmap" className="text-slate-600 hover:text-slate-900">
              Roadmap
            </a>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="hidden text-slate-600 hover:text-slate-900 md:inline-flex"
            >
              Sign in
            </button>
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="rounded-full px-6 text-sm font-semibold"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-8 pb-24 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="border-b border-black/5 pb-20 md:flex md:gap-16 lg:gap-24">
          {/* Left: Value Proposition (≈40%) */}
          <div className="flex flex-col justify-center gap-10 max-w-xl md:basis-2/5">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Structured career workspace
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-[3.5rem]">
                Turn your current CV
                <br />
                into the one that gets hired.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-slate-600">
                One calm place to move from today&apos;s CV to a version that matches your target role.
              </p>
            </div>

            <div className="space-y-3 text-base text-slate-700">
              <p>
                <span className="font-semibold">Targeted</span>
                <span className="text-slate-600"> — CVs built for one specific role at a time.</span>
              </p>
              <p>
                <span className="font-semibold">Measured</span>
                <span className="text-slate-600"> — gaps, scores, and tasks instead of guesses.</span>
              </p>
              <p>
                <span className="font-semibold">Guided</span>
                <span className="text-slate-600"> — a short, ordered list of changes to ship.</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Button
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="rounded-full px-8 py-6 text-base font-semibold"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing your workspace…
                  </>
                ) : (
                  <>
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                See how it works
              </button>
            </div>
          </div>

          {/* Right: Key product features (stacked cards, ≈60%) */}
          <div className="mt-12 flex flex-col justify-center gap-5 md:mt-0 md:basis-3/5 md:pl-8">
            {/* Feature 1 */}
            <Card className="border-none bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5 md:p-6">
                <div className="rounded-xl bg-slate-900/5 p-3">
                  <BarChart3 className="h-6 w-6 text-slate-900" />
                </div>
                <div className="space-y-1 text-sm md:text-base">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Live CV alignment score
                  </p>
                  <p className="text-slate-900">
                    See how close your current CV is to the target version as you edit.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-none bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5 md:p-6">
                <div className="rounded-xl bg-slate-900/5 p-3">
                  <Target className="h-6 w-6 text-slate-900" />
                </div>
                <div className="space-y-1 text-sm md:text-base">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Role-specific benchmarks
                  </p>
                  <p className="text-slate-900">
                    Compare against people already in the role instead of generic templates.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-none bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5 md:p-6">
                <div className="rounded-xl bg-slate-900/5 p-3">
                  <Route className="h-6 w-6 text-slate-900" />
                </div>
                <div className="space-y-1 text-sm md:text-base">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Task-based roadmap
                  </p>
                  <p className="text-slate-900">
                    A short, ordered queue of edits and projects to reach a ready-to-send CV.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-b border-black/5 py-16 md:py-20">
          <div className="space-y-10">
            <div className="max-w-xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                How it works
              </p>
              <p className="text-base text-slate-600">
                Three steps, one workspace: upload, analyse, then execute a short list of changes.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <FileText className="h-5 w-5 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step 1
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Upload &amp; choose role
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Drop in your current CV and set a single target role to anchor everything.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <Target className="h-5 w-5 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step 2
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      See the target CV
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  We build a target CV and surface the biggest gaps between today and that version.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <Route className="h-5 w-5 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step 3
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Follow the roadmap
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Turn each gap into a few concrete tasks and track progress to a ready-to-send CV.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Proof */}
        <section className="border-b border-black/5 py-16 md:py-20">
          <div className="space-y-10">
            <div className="max-w-xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Why this works
              </p>
              <p className="text-base text-slate-600">
                Calm, factual signals instead of hype — every decision grounded in real profiles and
                real paths.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-4">
              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <p className="text-4xl font-semibold text-slate-900">20+</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  real profiles per target role
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Benchmarked against people already doing the work you want.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <p className="text-4xl font-semibold text-slate-900">1</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  unified target CV per role
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  No stacks of versions — just the single document you&apos;re working toward.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <p className="text-4xl font-semibold text-slate-900">0</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">guesswork in gaps</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Every missing skill, project, or proof is explicitly listed and tracked.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-7 text-base shadow-sm">
                <p className="text-4xl font-semibold text-slate-900">Weeks</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">to application, visible</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Time-to-ready tracked alongside alignment, so you know where you stand.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section id="product" className="border-b border-black/5 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Product
              </p>
              <h2 className="text-2xl font-semibold leading-snug text-slate-900 md:text-3xl">
                Built to feel like a workspace, not a form.
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                PathForge is designed as a quiet, document-first workspace. Your CV, roadmap, and
                role data live in one place — no popups, no noisy dashboards, just deliberate
                progression.
              </p>
              <div className="space-y-3 text-base text-slate-700">
                <p>
                  <span className="font-semibold">Notion-like structure</span>
                  <span className="text-slate-600">
                    {" "}
                    — sections, tasks, and notes woven around a single document.
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Inline editing</span>
                  <span className="text-slate-600">
                    {" "}
                    — adjust lines in place and see alignment react in real time.
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Future sections visible</span>
                  <span className="text-slate-600">
                    {" "}
                    — greyed-out areas that hint at what&apos;s ahead without overwhelming you.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Inline CV Editor */}
              <Card className="border-none bg-white/80 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    CV workspace
                  </CardTitle>
                  <span className="text-xs text-slate-500">Draft · Auto-saved</span>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-5">
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Experience — current draft</span>
                      <span>Aligned 3/5 bullets</span>
                    </div>
                    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                      <p>
                        • Led end-to-end design and rollout of a payments service processing{" "}
                        <span className="font-semibold">2M+ transactions / month</span>.
                      </p>
                      <p className="opacity-70">
                        • Own and improve incident response workflow across on-call rotations.
                      </p>
                      <p className="opacity-40">
                        • Bullet suggestion reserved — add a concrete impact metric.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Alignment
                      </p>
                      <Progress value={68} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Notes
                      </p>
                      <p>Clarify ownership and impact.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Next change
                      </p>
                      <p>Add metric for incident reduction.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Roadmap / Future Sections */}
              <Card id="roadmap" className="border-none bg-white/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Roadmap overview
                  </CardTitle>
                  <span className="text-xs text-slate-500">Today · 3 tasks</span>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-4 py-3">
                      <span>Reframe project outcomes for payments migration</span>
                      <span className="text-xs text-slate-500">45 min</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-4 py-3">
                      <span>Document ownership across current team</span>
                      <span className="text-xs text-slate-500">30 min</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-4 py-3">
                      <span>Draft one new project aligned to role</span>
                      <span className="text-xs text-slate-500">60 min</span>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-dashed border-slate-200 pt-4 text-sm text-slate-500">
                    <p className="font-semibold text-slate-700">Coming into view</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-slate-50 px-4 py-2 opacity-70">
                        Certifications · Pending
                      </span>
                      <span className="rounded-full bg-slate-50 px-4 py-2 opacity-70">
                        References · Not configured
                      </span>
                      <span className="rounded-full bg-slate-50 px-4 py-2 opacity-70">
                        Application packets · Locked
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Workspace examples */}
        <section className="border-b border-black/5 py-16 md:py-20">
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Workspace examples
                </p>
                <p className="text-base text-slate-600">
                  A quick look at how a single role turns into scores and tasks inside the product.
                </p>
              </div>
              <CheckCircle2 className="hidden h-8 w-8 text-slate-400 md:block" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Target role card (example) */}
              <Card className="border-none bg-white/80 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <Target className="h-5 w-5 text-slate-900" />
                  </div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Target role
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">
                    Software Engineer · Google
                  </p>
                  <p className="text-xs text-slate-500">Mid / L4 · 184 profiles · US · Remote</p>
                </CardContent>
              </Card>

              {/* Alignment example */}
              <Card className="border-none bg-white/80 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <BarChart3 className="h-5 w-5 text-slate-900" />
                  </div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    CV alignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Current score</p>
                      <p className="text-3xl font-semibold text-slate-900">62%</p>
                    </div>
                    <div className="flex min-w-[120px] flex-col gap-1">
                      <Progress value={62} className="h-2" />
                      <p className="text-[0.7rem] text-slate-500">Target: 88%+</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Skills, projects, and narrative each contribute to the score.
                  </p>
                </CardContent>
              </Card>

              {/* Next tasks example */}
              <Card className="border-none bg-white/80 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="rounded-lg bg-slate-900/5 p-2.5">
                    <Route className="h-5 w-5 text-slate-900" />
                  </div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Next tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm text-slate-700">
                  <div className="space-y-2">
                    <p>• Tighten outcomes for current role.</p>
                    <p>• Add one project aligned to backend scope.</p>
                    <p>• Quantify impact on reliability or revenue.</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Small, specific edits instead of rewriting everything at once.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20 text-center">
          <div className="mx-auto max-w-xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Next step
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
              Your dream role shouldn&apos;t be a mystery.
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              Start with the CV you already have, pick the role you actually want, and work inside a
              system that makes the path explicit.
            </p>
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="mt-4 rounded-full px-8 py-6 text-base font-semibold"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Opening your workspace…
                </>
              ) : (
                <>Begin Setup</>
              )}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 text-sm text-slate-500">
          <p>© 2025 PathForge. All rights reserved.</p>
          <p className="hidden md:inline">Built for focused users, not browsers.</p>
        </div>
      </footer>
    </div>
  );
}
