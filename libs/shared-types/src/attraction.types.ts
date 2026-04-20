export type AttractionCategory =
  | 'culture'
  | 'entertainment'
  | 'city-tour'
  | 'food'
  | 'transport'
  | 'children'
  | 'healthcare'
  | 'safety'
  | 'shopping'
  | 'nature';

export type PriceRange = 'free' | 'budget' | 'mid-range' | 'expensive';

export type FoodStyle = 'sitting' | 'walking' | 'both';

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IOpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface IMultiLangText {
  en: string;
  it?: string;
  de?: string;
  fr?: string;
  es?: string;
}

export interface IAttraction {
  id: string;
  tenantId: string;
  externalId?: string;
  name: IMultiLangText;
  description: IMultiLangText;
  shortDescription: IMultiLangText;
  category: AttractionCategory;
  tags: string[];
  address: string;
  location: ICoordinates;
  openingHours?: IOpeningHours;
  priceRange?: PriceRange;
  foodStyle?: FoodStyle;
  durationMinutes?: number;
  imageUrl?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
