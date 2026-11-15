import Link from "next/link";
import { SiteLinks } from "@/components/SiteLinks";

export function CatalogMasthead() {
  return (
    <header className="catalog-masthead catalog-width">
      <Link href="/" className="catalog-brand" aria-label="AlgoVerse 首页"><span aria-hidden="true" />AlgoVerse</Link>
      <nav className="section-nav" aria-label="主导航">
        <SiteLinks />
      </nav>
    </header>
  );
}
