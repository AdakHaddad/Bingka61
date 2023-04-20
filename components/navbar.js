import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <Link className=" nav-link nav-main" href="/">
        Bingka 61
      </Link>
      <ul>
        <li>
          <Link className="nav-item nav-link" href="/">
            Home
          </Link>
        </li>
        <li>
          <Link className="nav-item nav-link" href="/product">
            <s> Product</s>
          </Link>
        </li>
        <li>
          <Link className="nav-item nav-link" href="/contact">
            Contact
          </Link>
        </li>
        <li>
          <Link className="nav-item nav-link" href="/blog">
            <s>Blog</s>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
