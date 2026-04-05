import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * Rewrites og:image and twitter:image to an absolute URL using SITE_URL or VERCEL_URL.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: "vite-plugin-meta-images",
    transformIndexHtml(html) {
      const baseUrl = getDeploymentBaseUrl();
      if (!baseUrl) {
        if (process.env.NODE_ENV === "production") {
          console.log(
            "[meta-images] SITE_URL or VERCEL_URL not set; skipping absolute meta image URLs",
          );
        }
        return html;
      }

      const publicDir = path.resolve(process.cwd(), "client", "public");
      const opengraphPngPath = path.join(publicDir, "opengraph.png");
      const opengraphJpgPath = path.join(publicDir, "opengraph.jpg");
      const opengraphJpegPath = path.join(publicDir, "opengraph.jpeg");

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = "png";
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = "jpg";
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = "jpeg";
      }

      if (!imageExt) {
        if (process.env.NODE_ENV === "production") {
          console.log(
            "[meta-images] client/public/opengraph.{png,jpg,jpeg} not found; skipping",
          );
        }
        return html;
      }

      const imageUrl = `${baseUrl.replace(/\/$/, "")}/opengraph.${imageExt}`;

      if (process.env.NODE_ENV === "production") {
        console.log("[meta-images] og/twitter image:", imageUrl);
      }

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`,
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`,
      );

      return html;
    },
  };
}

function getDeploymentBaseUrl(): string | null {
  const site = process.env.SITE_URL?.trim();
  if (site) {
    return normalizeBaseUrl(site);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeBaseUrl(
      vercel.startsWith("http") ? vercel : `https://${vercel}`,
    );
  }

  return null;
}

function normalizeBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url.replace(/\/$/, "");
  }
}
