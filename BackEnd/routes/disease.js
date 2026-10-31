import express from 'express';
import { requireAuth } from '../middleware/auth.js';

import {
  saveTempImage,
  deleteTempImage,
} from '../utils/tempFile.js';

import {
  detectDisease,
} from '../services/gradioService.js';

import {
  normalizeResult,
} from '../utils/formatter.js';

const router = express.Router();
router.use(requireAuth);

router.post('/disease-detect', async (req, res) => {
  let tempPath = null;

  try {
    const {
      imageBase64,
      fileName,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No image supplied.',
      });
    }

    tempPath = await saveTempImage(
      imageBase64,
      fileName
    );

    const raw =
      await detectDisease(tempPath);

    const result =
      normalizeResult(raw);

    res.json({
      success: true,
      result,
    });

  } catch (err) {

    res.status(err.status || 502).json({
      success: false,
      error: err.status ? err.message : 'Disease detection is unavailable. Please try again later.',
    });
  } finally {
    await deleteTempImage(tempPath);
  }
});

export default router;
