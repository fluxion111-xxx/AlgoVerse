import Link from "next/link";

export function CatalogMasthead({ isCatalog = false }: { isCatalog?: boolean }) {
  return (
    <header className="catalog-masthead catalog-width">
      <Link href="/" className="catalog-brand" aria-label="AlgoVerse 首页"><span aria-hidden="true" />AlgoVerse</Link>
      <nav aria-label="实验导航">
        {isCatalog ? <Link href="/">返回首页</Link> : <Link href="/experiments">返回实验中心</Link>}
      </nav>
    </header>
  );
}
