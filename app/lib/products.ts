export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  badge?: "Bestseller" | "New Drop" | "AI Generated";
  image: string;
  category: string;
  tags: string[];
  defaultColor?: string;
  defaultView?: "front" | "back";
  printPosition?: "front" | "back";
  version?: string;
  fileId?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "9",
    name: "Focus On The Good",
    description: "Inspiring white heavy-cotton tee featuring the 'Focus on the Good' design with a custom smiley and planetary globe print on the back.",
    price: 1499,
    badge: "Bestseller",
    image: "/api/gdrive/image?id=1179QCuVWCmJ3t5LSYlGeKTBPdFDdD54S",
    category: "Minimal",
    tags: ["minimal", "motivational"],
    defaultColor: "#ffffff",
    defaultView: "back",
    printPosition: "back",
    version: "Version 1"
  },
  {
    id: "10",
    name: "Rise Above All",
    description: "Techwear-inspired black heavy hoodie with a distressed 'RISE ABOVE ALL' backprint slashed with vivid scarlet vectors.",
    price: 2999,
    badge: "New Drop",
    image: "/api/gdrive/image?id=12N2qbS4nUeyDFQ7xnUwOfQYWFHh70bMD",
    category: "Minimal",
    tags: ["minimal", "hoodie"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 2"
  },
  {
    id: "11",
    name: "Future Is Now",
    description: "White long sleeve tee sporting a high-fidelity vertical purple nebula and rocket launch console print, complete with authentic Japanese elements.",
    price: 1799,
    badge: "AI Generated",
    image: "/api/gdrive/image?id=1yO-ulNQPYjvV1t9NyLYn_3UjQXdiduFm",
    category: "Anime",
    tags: ["cosmic", "anime", "future"],
    defaultColor: "#ffffff",
    defaultView: "back",
    printPosition: "back",
    version: "Version 3"
  },
  {
    id: "12",
    name: "Chaos Core",
    description: "Classic oversized black streetwear tee with blue gothic 'chaos' details overlaid on a cybernetic astronomical constellation grid.",
    price: 1599,
    badge: "Bestseller",
    image: "/api/gdrive/image?id=1tkawNRUetr_ESXsD6evHkQG7nxtw8H_J",
    category: "Minimal",
    tags: ["minimal", "chaos", "gothic", "geometry"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 4"
  },
  {
    id: "13",
    name: "Cosmic Wanderer",
    description: "Deep violet neural portal and mysterious silhouetted voyager print, detailed with Japanese 'Gate of Destiny' calligraphy on a heavy black cotton tee.",
    price: 1699,
    badge: "AI Generated",
    image: "/api/gdrive/image?id=1UM6DAGKkIaZ1tuQc-rMYOIBI3uAglJkb",
    category: "Streetwear",
    tags: ["streetwear", "portal", "mystical", "japanese"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 5"
  },
  {
    id: "14",
    name: "Discipline Repeat",
    description: "High-contrast block design tee displaying repeated 'DISCIPLINE' screenprints in alternating neon red and industrial white.",
    price: 1399,
    badge: "New Drop",
    image: "/api/gdrive/image?id=16cGCYfr9Vxz_WQc5ldYjmLSBU0W4Una6",
    category: "Minimal",
    tags: ["minimal", "discipline", "bold"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 6"
  },
  {
    id: "15",
    name: "Chaos Control",
    description: "Heavyweight white drop-shoulder tee with a detailed graphic of a skull wearing studio headphones, accented by slime-green 'CHAOS' graffiti and pink splatters.",
    price: 1899,
    badge: "AI Generated",
    image: "/api/gdrive/image?id=1__dRUU2YjBueY59q0xELpWIDADQrEW6I",
    category: "Streetwear",
    tags: ["streetwear", "skull", "chaos", "graffiti"],
    defaultColor: "#ffffff",
    defaultView: "back",
    printPosition: "back",
    version: "Version 7"
  },
  {
    id: "16",
    name: "Demon Path",
    description: "Black pullover techwear hoodie featuring a detailed crimson Oni mask graphic, red splash vectors, side Japanese characters, and the motivational 'FEAR NONE' script.",
    price: 3199,
    badge: "Bestseller",
    image: "/api/gdrive/image?id=1eekdRga6Xv9UMznd5lLJeLoogVG_OJdU",
    category: "Anime",
    tags: ["anime", "oni", "demon"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 8"
  },
  {
    id: "3",
    name: "Mindset",
    description: "Premium heavy-cotton crewneck tee in vintage cream, showcasing a clean print 'FOCUS DISCIPLINE SUCCESS' with 'NO EXCUSES' tagline.",
    price: 1699,
    badge: "New Drop",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    category: "Minimal",
    tags: ["mindset", "minimal", "motivation"],
    defaultColor: "#f5e6d3",
    defaultView: "front",
    printPosition: "front",
    version: "Version 9"
  },
  {
    id: "17",
    name: "Drip Smile",
    description: "Trippy cyber-acid yellow dripping smiley face print layered over abstract violet paint splatters on a premium black cotton tee.",
    price: 1599,
    badge: "New Drop",
    image: "/api/gdrive/image?id=15K4aBWFllN2SzXRhbalVcGvkmFXMiXns",
    category: "Streetwear",
    tags: ["streetwear", "smiley", "acid", "splatter"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 10"
  },
  {
    id: "18",
    name: "Neon Future",
    description: "Cyberpunk metropolis scene showing a lone wanderer amidst neon skyscraper arrays, featuring bold 'NEON FUTURE' and 'NO SIGNAL 2077' graphic overlays.",
    price: 1899,
    badge: "AI Generated",
    image: "/api/gdrive/image?id=16YLdFJxFskrAvyW93t5K-lsv6C1jBUth",
    category: "Streetwear",
    tags: ["streetwear", "cyberpunk", "metropolis", "neon"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 11"
  },
  {
    id: "19",
    name: "Shadow Within",
    description: "Premium black hoodie with a high-fidelity split-face anime illustration, ruby-red eyes, and side Japanese typography translating to 'Become stronger in the shadows'.",
    price: 3299,
    badge: "Bestseller",
    image: "/api/gdrive/image?id=1ffEw6uqNtMR2jWuTeC1_EsYgDRBVQd8G",
    category: "Anime",
    tags: ["anime", "ghoul"],
    defaultColor: "#1a1a1a",
    defaultView: "back",
    printPosition: "back",
    version: "Version 12"
  }
];

export const CATEGORIES = ["All", "Minimal", "Streetwear", "Vintage", "Anime"];

export async function fetchDriveProducts(forceRefresh = false): Promise<{ categories: string[]; products: Product[] }> {
  try {
    const url = forceRefresh ? "/api/gdrive?refresh=true" : "/api/gdrive";
    const res = await fetch(url);
    if (!res.ok) throw new Error("GDrive endpoint unreachable");
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      return {
        categories: data.categories || CATEGORIES,
        products: data.products,
      };
    }
  } catch (err) {
    console.warn("Failed to fetch live GDrive collection, using fallback:", err);
  }
  return { categories: CATEGORIES, products: PRODUCTS };
}

