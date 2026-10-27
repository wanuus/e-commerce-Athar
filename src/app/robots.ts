import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const private_ = ["/api/", ...["ar", "en"].flatMap((l) => [`/${l}/admin`, `/${l}/cart`, `/${l}/checkout`, `/${l}/orders/`, `/${l}/pay/`])];
  return { rules: [{ userAgent: "*", allow: "/", disallow: private_ }], sitemap: `${siteUrl()}/sitemap.xml` };
}
