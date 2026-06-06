export type Role = "owner" | "admin" | string;

export type ProductStatus = "available" | "unavailable" | "coming_soon" | "out_of_stock" | string;

export type Product = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  discount?: number;
  imageUrl?: string;
  status?: ProductStatus;
  quantity?: number;
  stockQuantity?: number;
  totalQuantity?: number;
  soldCount?: number;
  soldQuantity?: number;
  barcode?: string;
  relatedProductIds?: string[];
  flashOffersEnabled?: boolean;
  flashOfferEnabled?: boolean;
  flashStartAt?: number;
  flashEndAt?: number;
  flashPrice?: number;
  flashSaleEndTime?: number;
  ratingAverage?: number;
  reviewCount?: number;
  ratingSum?: number;
  ratingCount?: number;
  verifiedRatingSum?: number;
  verifiedRatingCount?: number;
  createdAt?: number;
  updatedAt?: number;
  keywords?: string[];
  searchTags?: string[];
  dominantColor?: string;
  productOrder?: number;
  showInHomeSelected?: boolean;
  showInTrendingNow?: boolean;
  showInFeaturedOffers?: boolean;
  homeSelectedOrder?: number;
  trendingNowOrder?: number;
  featuredOffersOrder?: number;
  customCardColorHex?: string;
  customCardColorIncludesImageFrame?: boolean;
  imageAspectRatioKey?: string;
  customImageAspectRatio?: string;
  aspectRatio?: string;
  customCardColor?: string;
};

export type BannerItem = {
  id: string;
  title?: string;
  imageUrl?: string;
  targetUrl?: string;
  type?: "display_only" | "product" | "category" | "external_url" | string;
  targetProductId?: string;
  targetCategory?: string;
  externalUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type AppIdentity = {
  storeName?: string;
  appName?: string;
  storeLogoUrl?: string;
  logoUrl?: string;
  externalAppImageUrl?: string;
  externalAppName?: string;
  externalAppImage?: string;
  splashText?: string;
  splashSubtitle?: string;
  splashTitle?: string;
  splashLogoUrl?: string;
  splashBackgroundUrl?: string;
  backgroundUrl?: string;
  splashDurationMs?: number;
  durationMs?: number;
  homeLogoIcon?: string;
  splashIcon?: string;
  invoiceIcon?: string;
  reportsIcon?: string;
  storeInfoIcon?: string;
  updatedAt?: number;
};

export type StoreTheme = {
  primaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
  followSystemTheme?: boolean;
  language?: string;
  productNameColorHex?: string;
  productPriceColorHex?: string;
  productDescriptionColorHex?: string;
  productCategoryColorHex?: string;
  productStockColorHex?: string;
};

export type FeatureToggles = {
  purchaseWithoutAccount?: boolean;
  flashOffers?: boolean;
  flashOffersEnabled?: boolean;
  relatedProducts?: boolean;
  relatedProductsEnabled?: boolean;
  ratings?: boolean;
  ratingsEnabled?: boolean;
  productReviews?: boolean;
  productRatings?: boolean;
  homeBanners?: boolean;
  bannersEnabled?: boolean;
  autoBanners?: boolean;
  autoBannersEnabled?: boolean;
  bannersAutoScrollEnabled?: boolean;
  bannerSpeed?: string;
  bannerSpeedMode?: string;
  bannerAutoScrollSeconds?: number;
  visualSearch?: boolean;
  visualSearchEnabled?: boolean;
  internalChat?: boolean;
  internalChatEnabled?: boolean;
  chatEnabled?: boolean;
  chatImageMessagesEnabled?: boolean;
  sideCategories?: boolean;
  sideCategoriesEnabled?: boolean;
};

export type StoreContact = {
  whatsapp?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  website?: string;
  customLinks?: string;
};

export type HomeFixedSectionItem = {
  title?: string;
  localizedTitles?: Record<string, string>;
  titleByLocale?: Record<string, string>;
  visible?: boolean;
  isVisible?: boolean;
  updatedAt?: number;
};

export type HomeFixedSectionsConfig = Record<string, HomeFixedSectionItem>;

export type HomeCustomSection = {
  id: string;
  title?: string;
  localizedTitles?: Record<string, string>;
  titleByLocale?: Record<string, string>;
  isVisible?: boolean;
  visible?: boolean;
  productIds?: string[];
  sortOrder?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type OrderItem = {
  productId?: string;
  id?: string;
  title?: string;
  name?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  finalPrice?: number;
  currency?: string;
  discount?: number;
  quantity?: number;
};

export type Order = {
  id: string;
  orderNumber?: string;
  userId?: string;
  customerUid?: string;
  userUid?: string;
  uid?: string;
  ownerUid?: string;
  customerDeviceId?: string;
  customerName?: string;
  phone?: string;
  normalizedPhone?: string;
  address?: string;
  customerNote?: string;
  orderNote?: string;
  note?: string;
  items?: OrderItem[];
  totalPrice?: number;
  total?: number;
  originalTotal?: number;
  savings?: number;
  totalByCurrency?: Record<string, number>;
  originalByCurrency?: Record<string, number>;
  savingsByCurrency?: Record<string, number>;
  paymentSummaryText?: string;
  status?: string;
  statusHistory?: Array<Record<string, unknown>>;
  stockDeducted?: boolean;
  stockDeductedItems?: Record<string, number>;
  isReadByAdmin?: boolean;
  timestamp?: number;
  statusUpdatedAt?: number;
  lastStatusUpdatedAt?: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  couponDiscountPercent?: number;
  totalBeforeCoupon?: number;
  totalAfterCoupon?: number;
  couponApplied?: boolean;
};

export type ChatConversation = {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerKey?: string;
  customerUid?: string;
  userUid?: string;
  uid?: string;
  userId?: string;
  ownerUid?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadForAdmin?: number;
  unreadForCustomer?: number;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  cleanupEligibleAt?: number;
};

export type ChatMessage = {
  id: string;
  conversationId?: string;
  senderType?: "customer" | "admin" | string;
  text?: string;
  type?: "text" | string;
  createdAt?: number;
  isRead?: boolean;
  customerUid?: string;
  userUid?: string;
  uid?: string;
  userId?: string;
  ownerUid?: string;
};

export type Coupon = {
  id: string;
  code?: string;
  type?: "percent" | "fixed" | string;
  value?: number;
  isActive?: boolean;
  expiresAt?: number;
  maxUses?: number;
  usedCount?: number;
  oneUsePerCustomer?: boolean;
  minOrderTotal?: number;
  allowedProductIds?: string[];
  allowedCategories?: string[];
  allowWithDiscountedProducts?: boolean;
  allowWithFlashOffers?: boolean;
  allowStackingDiscounts?: boolean;
  maxFinalDiscountPercent?: number;
  usedCustomerKeys?: string[];
  createdAt?: number;
  updatedAt?: number;
};


export type ProductRating = {
  id: string;
  productId?: string;
  userName?: string;
  customerDeviceId?: string;
  rating?: number;
  comment?: string;
  isVerified?: boolean;
  orderId?: string;
  timestamp?: number;
  updatedAt?: number;
  customerUid?: string;
  userUid?: string;
  uid?: string;
  userId?: string;
  ownerUid?: string;
};
