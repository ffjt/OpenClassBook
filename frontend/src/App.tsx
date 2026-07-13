import { ArrowUpRight, Github } from "lucide-react";

import { Button } from "@/components/ui/button";

const githubUrl = "https://github.com/ffjt/ClassBook-CMS";

function App() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(37,99,235,0.08),transparent_28%)]" />

      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a className="text-[15px] font-semibold tracking-[-0.02em]" href="#top">
          OpenClassBook
        </a>
        <a
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href={githubUrl}
          rel="noreferrer"
          target="_blank"
        >
          <Github className="size-4" />
          GitHub
        </a>
      </header>

      <section
        className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-14 px-6 pb-16 pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-20 lg:pt-4"
        id="top"
      >
        <div className="max-w-xl">
          <div className="mb-8 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-600" />
            Open-source publishing
          </div>

          <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            OpenClassBook
          </h1>
          <p className="mt-7 text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-zinc-400 sm:text-5xl">
            Collect.
            <br />
            Edit.
            <br />
            <span className="text-foreground">Publish.</span>
          </p>

          <p className="mt-8 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            An open-source publishing platform for collecting essays and
            generating print-ready books.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button className="group bg-blue-600 text-white hover:bg-blue-700" size="lg">
              Create a Book
              <ArrowUpRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
            <a
              className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-border bg-background px-7 text-[15px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Github className="mr-2 size-4" />
              View on GitHub
            </a>
          </div>
        </div>

        <div className="relative flex min-h-[420px] items-center justify-center lg:min-h-[620px]">
          <div className="absolute inset-[8%] rounded-[3rem] border border-zinc-200/70 bg-zinc-50/60 shadow-[0_40px_100px_-52px_rgba(15,23,42,0.28)]" />
          <img
            alt="Abstract editorial illustration of essays becoming a printed book"
            className="relative z-10 w-full max-w-[680px] object-contain"
            src="/openclassbook-hero.png"
          />
        </div>
      </section>
    </main>
  );
}

export default App;
