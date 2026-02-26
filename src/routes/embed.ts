import { Router } from "express";
import { buildEmbedUrl } from "../jwt";

const router = Router();

router.get("/embed-url", (req, res) => {
  try {
    const client = (req.query.client as string) || "dnkn";
    const url = buildEmbedUrl(client);
    res.json({ url });
  } catch (err) {
    console.error("Failed to mint embed JWT:", err);
    res.status(500).json({
      error: "Failed to generate embed URL",
    });
  }
});

export default router;
