"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Home, RefreshCw } from "lucide-react";
import { breadcrumbsFor, findActiveItem } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actions,
  onRefresh,
  refreshing,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);
  const Icon = findActiveItem(pathname)?.icon;

  return (
    <div className="mb-6 sm:mb-8">
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs font-medium">
        <Link
          href="/dashboard"
          aria-label="Dashboard"
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
        >
          <Home size={13} />
        </Link>
        {crumbs.map((crumb, i) => (
          // A section's first item can be the active item, so hrefs may repeat.
          <span key={`${i}-${crumb.href}`} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-muted-foreground/60" />
            {i === crumbs.length - 1 ? (
              <span className="text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground transition hover:text-primary">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        {(title || description) && (
          <div className="flex min-w-0 items-start gap-4">
            {Icon && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow sm:grid"
              >
                <Icon size={22} />
              </motion.span>
            )}
            <div className="min-w-0 space-y-1">
              {title && (
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
                  {title}
                </h1>
              )}
              {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} loading={refreshing}>
              {!refreshing && <RefreshCw size={16} />}
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
