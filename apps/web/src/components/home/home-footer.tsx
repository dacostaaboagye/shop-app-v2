"use client";

import { Terminal, Warehouse } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function HomeCTA() {
  return (
    <section className="px-6 py-32">
      <div className="mx-auto max-w-5xl text-center">
        <div className="inline-block mb-8 p-4 rounded-3xl bg-muted/40 backdrop-blur-sm border border-border/40">
          <Terminal className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-heading text-5xl font-bold mb-8">
          Ready to deploy?
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join the organizations using Shop V2 to maintain 100% stock accuracy
          across their entire supply chain.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={toRoute("/login")}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-16 rounded-xl px-12 font-bold text-lg",
            )}
          >
            Sign In To Operations
          </Link>
          <Link
            href="#"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-16 rounded-xl px-12 font-bold text-lg",
            )}
          >
            Talk to Sales
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="border-t border-border/20 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1 md:col-span-2 flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <Warehouse className="h-6 w-6 text-primary" />
              <span className="font-heading text-2xl font-bold tracking-tight">
                Shop.
              </span>
            </div>
            <p className="max-w-md text-muted-foreground leading-relaxed text-lg">
              High-precision inventory management for organizations that cannot
              afford errors. Built for performance, security, and absolute
              accountability.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <p className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Platform
            </p>
            <ul className="flex flex-col gap-4 font-medium">
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-6">
            <p className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Resources
            </p>
            <ul className="flex flex-col gap-4 font-medium">
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Legal
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 Shop Inc. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#" className="hover:text-primary">
              Twitter
            </Link>
            <Link href="#" className="hover:text-primary">
              GitHub
            </Link>
            <Link href="#" className="hover:text-primary">
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
