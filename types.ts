
export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
  prompt: string;
  style: string;
  theme: string;
  format: ImageFormat;
}

export enum GenerationStyle {
  PHOTOGRAPHIC = 'Fotográfico e Realista',
  MINIMALIST = 'Design Gráfico Minimalista',
  THREE_D = 'Renderização 3D Médica',
  ILLUSTRATION = 'Ilustração Moderna de Bem-estar'
}

export enum GenerationTheme {
  NATURE = 'Natureza e Frescor',
  SCIENCE = 'Ciência e Saúde',
  ZEN = 'Zen e Meditativo',
  ENERGY = 'Energia e Vitalidade',
  FREEDOM = 'Liberdade Abstrata'
}

export enum ImageFormat {
  SQUARE = 'Quadrado (Feed 1:1)',
  VERTICAL = 'Vertical (Feed 4:5)',
  STORY = 'Stories/Reels (9:16)',
  BANNER = 'Banner/Cinema (16:9)',
  BOOK = 'Capa de Livro (2:3)',
  PHONE = 'Mockup de Celular',
  ALL = 'Gerar Todos os Formatos'
}
