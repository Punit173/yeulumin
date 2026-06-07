export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: "AI Generated" | "Bestseller" | "New Drop";
  image: string;
  category: "Abstract" | "Typographic" | "Minimal" | "Illustrated";
  tags: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Neon Circuit Tee",
    description: "High-fidelity digital circuitry overlaying premium 280GSM heavy cotton. Styled with glowing phosphor nodes.",
    price: 1899,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    category: "Abstract",
    tags: ["cyberpunk", "neon", "circuit"]
  },
  {
    id: "2",
    name: "Abstract Wave Tee",
    description: "Fluid 3D simulation printed in ultra-dense high-gloss plastisol ink for depth and tactical texture.",
    price: 1699,
    badge: "New Drop",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    category: "Abstract",
    tags: ["fluid", "3d", "minimal"]
  },
  {
    id: "3",
    name: "Galactic Bloom Tee",
    description: "An iridescent botanical growth pattern engineered by generative adversarial neural network expansion.",
    price: 1999,
    badge: "AI Generated",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    category: "Illustrated",
    tags: ["floral", "nature", "generative"]
  },
  {
    id: "4",
    name: "Glitch Portrait Tee",
    description: "A distorted typographic portrait exploring the aesthetics of human-machine memory synchronization errors.",
    price: 1799,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80",
    category: "Abstract",
    tags: ["glitch", "portrait", "streetwear"]
  },
  {
    id: "5",
    name: "Minimal Grid Tee",
    description: "Precision orthographic vector grid layout. Architectural coordinates mapped for perfect structural alignment.",
    price: 1499,
    badge: "New Drop",
    image: "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=600&auto=format&fit=crop&q=80",
    category: "Minimal",
    tags: ["grid", "vector", "structural"]
  },
  {
    id: "6",
    name: "Urban Sketch Tee",
    description: "A raw collision of robotic aerosol strokes and generative spray calligraphy in a high-density black print.",
    price: 1599,
    badge: "AI Generated",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80",
    category: "Illustrated",
    tags: ["graffiti", "street", "grunge"]
  },
  {
    id: "7",
    name: "Cyberpunk Dragon Tee",
    description: "A traditional Eastern dragon silhouette merged with fiber-optic mesh scales and electric blue line highlights.",
    price: 2499,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    category: "Illustrated",
    tags: ["dragon", "cyber", "detailed"]
  },
  {
    id: "8",
    name: "Vintage Syntax Tee",
    description: "Terminal code prompt executing visual system diagnostic dumps. Rendered in retro monochrome green-phosphor typography.",
    price: 1399,
    badge: "New Drop",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    category: "Typographic",
    tags: ["vintage", "code", "minimal"]
  }
];

export const CATEGORIES = ["All", "Abstract", "Typographic", "Minimal", "Illustrated"];
