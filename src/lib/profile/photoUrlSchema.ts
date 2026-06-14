import { z } from "zod";

/** URL https ou data URL image (mock / upload local). */
export const profilePhotoUrlSchema = z
  .string()
  .min(1)
  .refine(
    (val) => {
      if (val.startsWith("data:image/")) {
        return /^data:image\/(jpeg|png|webp);base64,/.test(val) && val.length < 2_400_000;
      }
      try {
        const u = new URL(val);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL de photo invalide" }
  );

/** Profil : au moins 1 photo, au plus 6. */
export const profilePhotoUrlsSchema = z
  .array(profilePhotoUrlSchema)
  .min(1, "Ajoute au moins 1 photo")
  .max(6, "Maximum 6 photos");
