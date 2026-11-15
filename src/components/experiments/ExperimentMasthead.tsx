import Link from "next/link";
import { SiteLinks } from "@/components/SiteLinks";

export function ExperimentMasthead({ returnHref = "/experiments", returnLabel = "返回实验中心" }: { returnHref?: string; returnLabel?: string }) {
  return (
    <header className="experiment-masthead">
      <Link className="experiment-brand" href="/" aria-label="AlgoVerse 首页">
        <span aria-hidden="true" />AlgoVerse
      </Link>
      <nav className="section-nav" aria-label="主导航"><SiteLinks /></nav>
      <Link className="experiment-back" href={returnHref}>{returnLabel}</Link>
    </header>
  );
}
