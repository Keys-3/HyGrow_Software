/**
 * HyGrow — Curated Produce & Technology Imagery Catalog
 * Provides high-resolution, verified imagery for inventory items,
 * marketing products, blog stories, and AI diagnostic modules.
 */

export interface ProducePreset {
  name: string;
  category: string;
  imageUrl: string;
}

export const PRODUCE_PRESETS: ProducePreset[] = [
  {
    name: 'Butterhead Lettuce',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80',
  },
  {
    name: 'Roma Tomatoes',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80',
  },
  {
    name: 'Sweet Strawberries',
    category: 'Fruits',
    imageUrl: 'https://images.unsplash.com/photo-1518131672697-611ec571bb15?w=600&q=80',
  },
  {
    name: 'Italian Basil',
    category: 'Herbs',
    imageUrl: 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=600&q=80',
  },
  {
    name: 'Baby Spinach',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80',
  },
  {
    name: 'English Cucumber',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&q=80',
  },
  {
    name: 'Radish Microgreens',
    category: 'Microgreens',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80',
  },
  {
    name: 'Bell Peppers',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&q=80',
  },
  {
    name: 'Curly Kale',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6fa57?w=600&q=80',
  },
  {
    name: 'Spearmint Leaves',
    category: 'Herbs',
    imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&q=80',
  },
  {
    name: 'Crisp Bok Choy',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&q=80',
  },
  {
    name: 'Cherry Tomatoes',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&q=80',
  },
];

/**
 * Returns a high-res, relevant image for any produce or inventory item.
 * If a custom URL is provided, returns it; otherwise maps by keywords.
 */
export function getProduceImageUrl(
  name?: string | null,
  category?: string | null,
  customUrl?: string | null
): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().startsWith('http')) {
    return customUrl.trim();
  }

  const query = `${name || ''} ${category || ''}`.toLowerCase();

  if (query.includes('lettuce') || query.includes('salad') || query.includes('romaine')) {
    return 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80';
  }
  if (query.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80';
  }
  if (query.includes('strawberr') || query.includes('berry')) {
    return 'https://images.unsplash.com/photo-1518131672697-611ec571bb15?w=600&q=80';
  }
  if (query.includes('basil')) {
    return 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=600&q=80';
  }
  if (query.includes('spinach') || query.includes('palak')) {
    return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80';
  }
  if (query.includes('cucumber') || query.includes('kheera')) {
    return 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&q=80';
  }
  if (query.includes('microgreen') || query.includes('sprout')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80';
  }
  if (query.includes('pepper') || query.includes('capsicum') || query.includes('chilli')) {
    return 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&q=80';
  }
  if (query.includes('kale')) {
    return 'https://images.unsplash.com/photo-1524179091875-bf99a9a6fa57?w=600&q=80';
  }
  if (query.includes('mint') || query.includes('pudina')) {
    return 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&q=80';
  }
  if (query.includes('bok choy') || query.includes('cabbage')) {
    return 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&q=80';
  }
  if (query.includes('herb') || query.includes('coriander') || query.includes('parsley')) {
    return 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&q=80';
  }
  if (query.includes('fruit')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80';
  }

  // General fresh organic hydroponic produce fallback
  return 'https://images.unsplash.com/photo-1595858273617-e4318ee47683?w=600&q=80';
}

