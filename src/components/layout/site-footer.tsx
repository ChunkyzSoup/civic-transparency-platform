import Link from "next/link";
import { DISCLAIMER, LIMITATION_COPY } from "@/lib/safety-copy";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell site-footer-inner">
        <p>{DISCLAIMER}</p>
        <p>{LIMITATION_COPY}</p>
        <p>
          Read the <Link href="/methodology">methodology</Link> and{" "}
          <Link href="/sources">sources</Link> before drawing conclusions.
        </p>
      </div>
    </footer>
  );
}

