import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `shop-${Date.now()}`;
}

// Register a new shop + owner (madam). Creates the tenant and the first user.
export async function POST(req: Request) {
  try {
    const { shopName, fullName, email, password, gender } = await req.json();
    if (!shopName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Shop name, your name, email and password are required." },
        { status: 400 }
      );
    }

    const emailNorm = String(email).toLowerCase().trim();
    const existingUser = await db.user.findUnique({ where: { email: emailNorm } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    // Generate a unique slug
    let slug = slugify(String(shopName));
    let suffix = 1;
    while (await db.shop.findUnique({ where: { slug } })) {
      slug = `${slugify(String(shopName))}-${suffix++}`;
    }

    // Create the shop + owner + default settings in a transaction
    const ownerGender = gender || "Female";
    const ownerLabel = ownerGender === "Male" ? "Master" : "Madam";

    const shop = await db.shop.create({
      data: {
        name: String(shopName).trim(),
        slug,
        plan: "trial",
        currency: "GHS",
        settings: {
          create: {
            ownerGender: ownerLabel,
            studioName: String(shopName).trim(),
          },
        },
        users: {
          create: {
            email: emailNorm,
            fullName: String(fullName).trim(),
            role: "madam",
            gender: ownerGender,
            password: String(password),
          },
        },
      },
      include: {
        users: true,
        settings: true,
      },
    });

    const user = shop.users[0];
    const token = Buffer.from(`${user.id}:${shop.id}`).toString("base64");
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        gender: user.gender,
        shopId: shop.id,
        shop: { id: shop.id, name: shop.name, slug: shop.slug, currency: shop.currency },
      },
    });
    res.cookies.set("ms_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "Could not create your shop. Please try again." },
      { status: 500 }
    );
  }
}
