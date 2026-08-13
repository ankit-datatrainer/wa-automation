"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, RefreshCw } from "lucide-react";
import { breadcrumbsFor } from "@/lib/navigation";
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

  return (
    <div className="mb-6 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" aria-label="Dashboard" className="text-muted-foreground hover:text-foreground">
            <Home size={16} />
          </Link>
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-muted-foreground" />
              {i === crumbs.length - 1 ? (
                <span className="font-semibold">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} loading={refreshing}>
              {!refreshing && <RefreshCw size={16} />}
              Refresh
            </Button>
          )}
        </div>
      </div>

      {(title || description) && (
        <div className="mt-4 space-y-1">
          {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
    </div>
  );
}
