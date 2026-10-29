import { z } from "zod";

export const CardIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Card id must be a lowercase slug")
  .brand<"CardId">();
export type CardId = z.infer<typeof CardIdSchema>;

export const PrintingIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Printing id must be a lowercase slug")
  .brand<"PrintingId">();
export type PrintingId = z.infer<typeof PrintingIdSchema>;

export const DomainSchema = z.enum(["fury", "calm", "mind", "body", "chaos", "order", "colorless"]);
export type Domain = z.infer<typeof DomainSchema>;

export const CardTypeSchema = z.enum(["legend", "unit", "spell", "gear", "rune", "battlefield"]);
export type CardType = z.infer<typeof CardTypeSchema>;

export const SupertypeSchema = z.enum(["champion", "signature", "basic", "token"]);
export type Supertype = z.infer<typeof SupertypeSchema>;

export const RaritySchema = z.enum(["common", "uncommon", "rare", "epic", "showcase"]);
export type Rarity = z.infer<typeof RaritySchema>;

export const VariantSchema = z.enum(["standard", "alt-art", "signed", "special", "token", "rune"]);
export type Variant = z.infer<typeof VariantSchema>;

export const OrientationSchema = z.enum(["portrait", "landscape"]);
export type Orientation = z.infer<typeof OrientationSchema>;

const StatSchema = z.int().nonnegative();

export const CardSetSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]+$/, "Set code must be uppercase alphanumeric"),
  name: z.string().min(1),
});
export type CardSet = z.infer<typeof CardSetSchema>;

export const PrintingSchema = z.object({
  id: PrintingIdSchema,
  publicCode: z.string().min(1),
  set: CardSetSchema,
  collectorNumber: z.int().nonnegative(),
  variant: VariantSchema,
  rarity: RaritySchema,
  artist: z.string().min(1).nullable(),
  imageUrl: z.url(),
  orientation: OrientationSchema,
});
export type Printing = z.infer<typeof PrintingSchema>;

export const GameplaySchema = z.object({
  type: CardTypeSchema.nullable(),
  supertype: SupertypeSchema.nullable(),
  domains: z.array(DomainSchema),
  energyCost: StatSchema.nullable(),
  powerCost: StatSchema.nullable(),
  might: StatSchema.nullable(),
  mightBonus: StatSchema.nullable(),
  ability: z.string().min(1).nullable(),
  effect: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1)),
});
export type Gameplay = z.infer<typeof GameplaySchema>;
export type GameplayField = keyof Gameplay;
export const GAMEPLAY_FIELDS: readonly GameplayField[] = GameplaySchema.keyof().options;

export const CardSchema = z.object({
  id: CardIdSchema,
  name: z.string().min(1),
  subtitle: z.string().min(1).nullable(),
  ...GameplaySchema.shape,
  printings: z.array(PrintingSchema).min(1),
});
export type Card = z.infer<typeof CardSchema>;
